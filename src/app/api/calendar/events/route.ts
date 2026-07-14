/**
 * GET  /api/calendar/events  → list events in range (incl. goal + recurrence)
 * POST /api/calendar/events  → create event (click/drag a slot)
 *
 * Calendar v2: events carry a goal link, location, notes, color, all-day and a
 * simple recurrence rule (none|daily|weekly|biweekly|monthly + optional until).
 * When a live Google source is connected (and GOOGLE creds are set) the created
 * event is ALSO pushed to Google Calendar and the returned id is stored on
 * googleEventId — fully gated + best-effort (a Google failure never fails the
 * local create). Recurring masters are NOT expanded here; the read layer
 * (calendar page) expands them for display.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { pushEventToGoogle } from '@/lib/external/google-calendar'
import { z } from 'zod'

// Fixed cadences, or custom weekdays "days:0,3,5" (0=Sun..6=Sat).
const RECURRENCE = z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly'])
  .or(z.string().regex(/^days:[0-6](,[0-6]){0,6}$/))

const CreateEventSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  taskId: z.string().uuid().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
  title: z.string().max(300).optional(),
  description: z.string().max(4000).default(''),
  location: z.string().max(500).optional().nullable(),
  allDay: z.boolean().default(false),
  domainId: z.string().optional().nullable(),
  color: z.string().max(40).optional().nullable(),
  recurrenceRule: RECURRENCE.default('none'),
  recurrenceUntil: z.string().datetime().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from') ?? new Date().toISOString()
  const to = searchParams.get('to') ?? new Date(Date.now() + 30 * 86400000).toISOString()

  const events = await prisma.calendarEvent.findMany({
    where: {
      userId: auth.userId,
      startAt: { gte: new Date(from) },
      endAt: { lte: new Date(to) },
    },
    include: {
      task: {
        select: {
          id: true, name: true, status: true, priority: true,
          energyRequired: true, duration: true,
        },
      },
    },
    orderBy: { startAt: 'asc' },
  })

  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = CreateEventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const {
    startAt, endAt, taskId, goalId, title, description, location,
    allDay, domainId, color, recurrenceRule, recurrenceUntil,
  } = parsed.data
  const start = new Date(startAt)
  const end = new Date(endAt)

  // Resolve title/domain from task or goal when not explicitly given.
  let eventTitle = title ?? ''
  let resolvedDomainId = domainId ?? null
  if (taskId && !eventTitle) {
    const task = await prisma.oSTask.findFirst({
      where: { id: taskId, userId: auth.userId },
      select: { id: true, name: true, domainId: true },
    })
    if (task) {
      eventTitle = task.name
      resolvedDomainId = resolvedDomainId ?? task.domainId
    }
  }
  // A linked goal can supply the domain colour even if it doesn't name the event.
  if (goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: auth.userId },
      select: { id: true, domainId: true, name: true },
    })
    if (goal) resolvedDomainId = resolvedDomainId ?? goal.domainId
    else if (goalId) {
      // Ignore a goal that isn't the caller's (never trust client-supplied ids).
    }
  }
  if (!eventTitle) eventTitle = 'New event'

  const event = await prisma.calendarEvent.create({
    data: {
      userId: auth.userId,
      title: eventTitle,
      description,
      location: location ?? null,
      startAt: start,
      endAt: end,
      allDay,
      domainId: resolvedDomainId,
      color: color ?? null,
      taskId: taskId ?? null,
      goalId: goalId ?? null,
      recurrenceRule,
      recurrenceUntil: recurrenceUntil ? new Date(recurrenceUntil) : null,
    },
  })

  // Best-effort two-way push (gated + no-throw). Store the mapping if it lands.
  try {
    const pushed = await pushEventToGoogle(auth.userId, {
      title: eventTitle, description, location, startAt: start, endAt: end, allDay,
    })
    if (pushed.ok) {
      await prisma.calendarEvent.update({
        where: { id: event.id },
        data: { googleEventId: pushed.googleEventId, googleCalendarId: pushed.googleCalendarId },
      })
    }
  } catch { /* never block the local create on a Google hiccup */ }

  const fresh = await prisma.calendarEvent.findUnique({ where: { id: event.id } })
  return NextResponse.json(fresh ?? event, { status: 201 })
}
