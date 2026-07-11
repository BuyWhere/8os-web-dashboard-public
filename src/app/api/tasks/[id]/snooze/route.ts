/**
 * POST /api/tasks/[id]/snooze
 * Snooze a task by moving its scheduledAt forward. Accepts either an absolute
 * ISO datetime (`until`) or a relative offset (`unit` + `value`):
 *   { until: "2026-07-04T09:00:00Z" }   |   { unit: "days", value: 1 }
 * `unit` ∈ minute|hour|day|week. If the task is unscheduled it gets placed at
 * now+offset. The calendar event is re-synced to the new slot.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const SnoozeSchema = z
  .object({
    until: z.string().datetime().optional(),
    unit: z.enum(['minute', 'hour', 'day', 'week']).optional(),
    value: z.number().int().min(1).max(365).optional(),
  })
  .refine((d) => !!d.until || (!!d.unit && typeof d.value === 'number'), {
    message: 'Provide either `until` or both `unit` and `value`',
  })

const UNIT_MS: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const task = await prisma.oSTask.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = SnoozeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { until, unit, value } = parsed.data
  const base = task.scheduledAt ?? new Date()
  const newStart = until ? new Date(until) : new Date(base.getTime() + (unit ? UNIT_MS[unit] * (value ?? 1) : 0))

  const updated = await prisma.oSTask.update({
    where: { id: task.id },
    data: {
      scheduledAt: newStart,
      scheduledEnd: new Date(newStart.getTime() + task.duration * 60_000),
      updatedAt: new Date(),
    },
  })

  // Re-sync the calendar event.
  await prisma.calendarEvent.deleteMany({ where: { taskId: task.id } })
  await prisma.calendarEvent.create({
    data: {
      userId: auth.userId,
      taskId: task.id,
      title: updated.name,
      startAt: updated.scheduledAt!,
      endAt: updated.scheduledEnd!,
      domainId: updated.domainId,
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: auth.userId,
      taskId: task.id,
      action: 'task_snoozed',
      metadata: { until: newStart.toISOString() },
    },
  })

  return NextResponse.json(updated)
}
