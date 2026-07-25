import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('complete_task'), taskId: z.string().min(1) }),
  z.object({ action: z.literal('start_task'), taskId: z.string().min(1) }),
  z.object({
    action: z.literal('snooze_task'),
    taskId: z.string().min(1),
    until: z.string().datetime().optional(),
    unit: z.enum(['minute', 'hour', 'day', 'week']).optional(),
    value: z.number().int().min(1).max(365).optional(),
  }).refine((d) => !!d.until || (!!d.unit && typeof d.value === 'number'), {
    message: 'Provide either `until` or both `unit` and `value` for snooze_task',
  }),
])

const UNIT_MS: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
}

/**
 * POST /api/briefing/action
 *
 * Small, stable action surface for the Flow-AI agent. It intentionally supports
 * only briefing-safe task state transitions and logs every mutation.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const task = await prisma.oSTask.findFirst({ where: { id: parsed.data.taskId, userId: auth.userId } })
  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

  try {
    if (parsed.data.action === 'complete_task') {
      const updated = await prisma.oSTask.update({
        where: { id: task.id },
        data: { status: 'done', completedAt: new Date(), updatedAt: new Date() },
      })
      await prisma.activityLog.create({
        data: { userId: auth.userId, taskId: task.id, action: 'task_completed', metadata: { source: 'briefing_action', name: task.name } },
      })
      return NextResponse.json({ ok: true, contract: 'flow-ai.briefing.action.v1', action: parsed.data.action, task: updated })
    }

    if (parsed.data.action === 'start_task') {
      const updated = await prisma.oSTask.update({
        where: { id: task.id },
        data: { status: 'in_progress', updatedAt: new Date() },
      })
      await prisma.activityLog.create({
        data: { userId: auth.userId, taskId: task.id, action: 'task_started', metadata: { source: 'briefing_action', name: task.name } },
      })
      return NextResponse.json({ ok: true, contract: 'flow-ai.briefing.action.v1', action: parsed.data.action, task: updated })
    }

    const base = task.scheduledAt ?? new Date()
    const newStart = parsed.data.until
      ? new Date(parsed.data.until)
      : new Date(base.getTime() + UNIT_MS[parsed.data.unit!] * parsed.data.value!)
    const updated = await prisma.oSTask.update({
      where: { id: task.id },
      data: {
        scheduledAt: newStart,
        scheduledEnd: new Date(newStart.getTime() + task.duration * 60_000),
        updatedAt: new Date(),
      },
    })
    await prisma.calendarEvent.deleteMany({ where: { taskId: task.id } })
    if (updated.scheduledAt && updated.scheduledEnd) {
      await prisma.calendarEvent.create({
        data: {
          userId: auth.userId,
          taskId: task.id,
          title: updated.name,
          startAt: updated.scheduledAt,
          endAt: updated.scheduledEnd,
          domainId: updated.domainId,
        },
      })
    }
    await prisma.activityLog.create({
      data: { userId: auth.userId, taskId: task.id, action: 'task_snoozed', metadata: { source: 'briefing_action', until: newStart.toISOString() } },
    })
    return NextResponse.json({ ok: true, contract: 'flow-ai.briefing.action.v1', action: parsed.data.action, task: updated })
  } catch (error) {
    console.error('[/api/briefing/action POST]', error)
    return NextResponse.json({ error: 'Failed to apply briefing action.' }, { status: 500 })
  }
}
