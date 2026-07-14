/**
 * PATCH  /api/calendar/events/[id] → update an event (move / resize / edit)
 * DELETE /api/calendar/events/[id] → delete an event
 *
 * Calendar v2: PATCH accepts the full editable surface (times, title, notes,
 * location, all-day, colour, goal link, recurrence). When the event is mirrored
 * to Google (googleEventId set) and Google is connected, the change is pushed
 * upstream (PATCH) / the delete removes the upstream copy — both best-effort and
 * fully gated (a Google failure never fails the local write). goalId is
 * validated against the caller's own goals.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { updateGoogleEvent, deleteGoogleEvent } from '@/lib/external/google-calendar'
import { updateMicrosoftEvent, deleteMicrosoftEvent, MICROSOFT_CALENDAR_PROVIDER } from '@/lib/external/microsoft-calendar'
import { z } from 'zod'

// Fixed cadences, or custom weekdays "days:0,3,5" (0=Sun..6=Sat).
const RECURRENCE = z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly'])
  .or(z.string().regex(/^days:[0-6](,[0-6]){0,6}$/))

const UpdateEventSchema = z.object({
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  title: z.string().max(300).optional(),
  description: z.string().max(4000).optional(),
  location: z.string().max(500).optional().nullable(),
  allDay: z.boolean().optional(),
  color: z.string().max(40).optional().nullable(),
  domainId: z.string().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
  recurrenceRule: RECURRENCE.optional(),
  recurrenceUntil: z.string().datetime().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // External (Google-sourced) event: id is "ext-<externalEventId>". Not a native
  // calendarEvent — the edit is written straight back to Google and mirrored in
  // the local external_events row so it shows immediately (no "edit at source").
  if (params.id.startsWith('ext-')) {
    const ext = await prisma.externalEvent.findFirst({
      where: { id: params.id.slice(4), userId: auth.userId, isDeleted: false },
    })
    if (!ext) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()
    const parsed = UpdateEventSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const d = parsed.data
    const newStart = d.startAt ? new Date(d.startAt) : ext.startsAt
    const newEnd = d.endAt ? new Date(d.endAt) : ext.endsAt
    const newTitle = d.title !== undefined ? d.title : (ext.title ?? 'Busy')
    const evShape = { title: newTitle, description: null, location: d.location ?? null, startAt: newStart, endAt: newEnd, allDay: d.allDay ?? false }
    // Write back to whichever provider owns this external event.
    const src = await prisma.externalSignalSource.findUnique({ where: { id: ext.sourceId }, select: { provider: true } })
    let pushedToGoogle = false
    try {
      const res = src?.provider === MICROSOFT_CALENDAR_PROVIDER
        ? await updateMicrosoftEvent(ext.sourceId, ext.externalId, evShape)
        : await updateGoogleEvent(auth.userId, ext.externalId, evShape, 'primary')
      pushedToGoogle = !!res.ok
    } catch { /* surfaced via pushedToGoogle:false */ }
    const updatedExt = await prisma.externalEvent.update({
      where: { id: ext.id },
      data: { title: newTitle, startsAt: newStart, endsAt: newEnd },
    })
    return NextResponse.json({
      id: `ext-${updatedExt.id}`, title: updatedExt.title,
      startAt: updatedExt.startsAt, endAt: updatedExt.endsAt,
      external: true, pushedToGoogle,
    })
  }

  const event = await prisma.calendarEvent.findFirst({
    where: { id: params.id, userId: auth.userId },
  })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateEventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const d = parsed.data

  const update: Record<string, unknown> = {}
  if (d.startAt) update.startAt = new Date(d.startAt)
  if (d.endAt) update.endAt = new Date(d.endAt)
  if (d.title !== undefined) update.title = d.title
  if (d.description !== undefined) update.description = d.description
  if (d.location !== undefined) update.location = d.location
  if (d.allDay !== undefined) update.allDay = d.allDay
  if (d.color !== undefined) update.color = d.color
  if (d.domainId !== undefined) update.domainId = d.domainId
  if (d.recurrenceRule !== undefined) update.recurrenceRule = d.recurrenceRule
  if (d.recurrenceUntil !== undefined) update.recurrenceUntil = d.recurrenceUntil ? new Date(d.recurrenceUntil) : null

  // goalId: only accept an id the caller actually owns; null clears the link.
  if (d.goalId !== undefined) {
    if (d.goalId === null) {
      update.goalId = null
    } else {
      const goal = await prisma.goal.findFirst({
        where: { id: d.goalId, userId: auth.userId },
        select: { id: true, domainId: true },
      })
      if (goal) {
        update.goalId = goal.id
        if (d.domainId === undefined && event.domainId == null) update.domainId = goal.domainId
      }
      // silently ignore a goal that isn't theirs
    }
  }

  const updated = await prisma.calendarEvent.update({
    where: { id: params.id },
    data: update,
  })

  // Mirror the change upstream when this event is linked to Google.
  if (updated.googleEventId) {
    try {
      const res = await updateGoogleEvent(auth.userId, updated.googleEventId, {
        title: updated.title,
        description: updated.description,
        location: updated.location,
        startAt: updated.startAt,
        endAt: updated.endAt,
        allDay: updated.allDay,
      }, updated.googleCalendarId ?? 'primary')
      // updateGoogleEvent may recreate (404/410 upstream) → capture the new id.
      if (res.ok && res.googleEventId !== updated.googleEventId) {
        await prisma.calendarEvent.update({
          where: { id: updated.id },
          data: { googleEventId: res.googleEventId, googleCalendarId: res.googleCalendarId },
        })
      }
    } catch { /* best-effort */ }
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // External (Google-sourced) event → delete upstream + tombstone the mirror.
  if (params.id.startsWith('ext-')) {
    const ext = await prisma.externalEvent.findFirst({
      where: { id: params.id.slice(4), userId: auth.userId },
    })
    if (!ext) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const src = await prisma.externalSignalSource.findUnique({ where: { id: ext.sourceId }, select: { provider: true } })
    try {
      if (src?.provider === MICROSOFT_CALENDAR_PROVIDER) await deleteMicrosoftEvent(ext.sourceId, ext.externalId)
      else await deleteGoogleEvent(auth.userId, ext.externalId, 'primary')
    } catch { /* best-effort */ }
    await prisma.externalEvent.update({ where: { id: ext.id }, data: { isDeleted: true } })
    return NextResponse.json({ ok: true, id: params.id })
  }

  const event = await prisma.calendarEvent.findFirst({
    where: { id: params.id, userId: auth.userId },
  })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Remove the upstream mirror first (best-effort, gated, idempotent).
  if (event.googleEventId) {
    try {
      await deleteGoogleEvent(auth.userId, event.googleEventId, event.googleCalendarId ?? 'primary')
    } catch { /* best-effort */ }
  }

  await prisma.calendarEvent.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true, id: params.id })
}
