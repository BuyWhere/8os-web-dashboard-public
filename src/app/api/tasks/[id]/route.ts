/**
 * GET   /api/tasks/[id]   → single task
 * PATCH /api/tasks/[id]   → update (status, scheduledAt, etc.)
 * DELETE /api/tasks/[id]  → cancel
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'
import { setSubtasks, sanitizeSubtasks } from '@/lib/subtasks'

const UpdateSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  notes: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  duration: z.number().int().min(5).max(480).optional(),
  energyRequired: z.enum(['green', 'yellow', 'red']).optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']).optional(),
  subtasks: z.array(z.object({ id: z.string().max(40), text: z.string().min(1).max(300), done: z.boolean() })).max(30).optional(),
})

/** Next occurrence for a recurrence rule, stepped from the task's scheduled time. */
function nextOccurrenceDate(from: Date, rule: string): Date | null {
  const d = new Date(from)
  if (rule === 'daily') d.setDate(d.getDate() + 1)
  else if (rule === 'weekly') d.setDate(d.getDate() + 7)
  else if (rule === 'biweekly') d.setDate(d.getDate() + 14)
  else if (rule === 'monthly') d.setMonth(d.getMonth() + 1)
  else return null
  return d
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const task = await prisma.oSTask.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(task)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const task = await prisma.oSTask.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const update: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() }
  // Checklist lives in a sidecar jsonb column (not a Prisma field) — strip it
  // from the model update and persist via setSubtasks below.
  delete update.subtasks
  if (parsed.data.subtasks !== undefined) {
    await setSubtasks(auth.userId, task.id, sanitizeSubtasks(parsed.data.subtasks)).catch(() => {})
  }

  if (parsed.data.scheduledAt !== undefined) {
    const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null
    const duration = parsed.data.duration ?? task.duration
    update.scheduledAt = scheduledAt
    update.scheduledEnd = scheduledAt ? new Date(scheduledAt.getTime() + duration * 60 * 1000) : null
  }

  let nextOccurrence: unknown = null
  if (parsed.data.status === 'done' && task.status !== 'done') {
    update.completedAt = new Date()
    // Log completion
    await prisma.activityLog.create({
      data: { userId: auth.userId, taskId: task.id, action: 'task_completed', metadata: { name: task.name } },
    })
    // Update parent goal progress
    if (task.goalId) await recomputeGoalProgress(task.goalId, auth.userId)

    // RECURRING TASKS: completing an instance spawns the next occurrence (the
    // recurrence fields existed in the schema but nothing consumed them, so
    // "repeat" silently did nothing). Respects recurrenceUntil.
    if (task.recurrence && task.recurrence !== 'none') {
      const base = task.scheduledAt ?? new Date()
      const next = nextOccurrenceDate(base, task.recurrence)
      if (next && (!task.recurrenceUntil || next <= task.recurrenceUntil)) {
        const nextEnd = new Date(next.getTime() + task.duration * 60 * 1000)
        const spawned = await prisma.oSTask.create({
          data: {
            userId: auth.userId,
            name: task.name,
            notes: task.notes,
            projectId: task.projectId,
            goalId: task.goalId,
            domainId: task.domainId,
            duration: task.duration,
            priority: task.priority,
            energyRequired: task.energyRequired,
            recurrence: task.recurrence,
            recurrenceUntil: task.recurrenceUntil,
            scheduledAt: next,
            scheduledEnd: nextEnd,
          },
        }).catch(() => null)
        if (spawned) {
          await prisma.calendarEvent.create({
            data: {
              userId: auth.userId, taskId: spawned.id, title: spawned.name,
              startAt: next, endAt: nextEnd, domainId: spawned.domainId,
            },
          }).catch(() => {})
          nextOccurrence = spawned
        }
      }
    }
  }

  const updated = await prisma.oSTask.update({ where: { id: params.id }, data: update })

  // Sync calendar event if scheduled time changed
  if (parsed.data.scheduledAt !== undefined) {
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
  }

  // _nextOccurrence: extra key (additive, safe for existing consumers) so the UI
  // can show the freshly-spawned recurring instance without a refetch.
  return NextResponse.json(nextOccurrence ? { ...updated, _nextOccurrence: nextOccurrence } : updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const task = await prisma.oSTask.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.oSTask.update({ where: { id: params.id }, data: { status: 'cancelled' } })
  return NextResponse.json({ ok: true })
}

async function recomputeGoalProgress(goalId: string, userId: string) {
  const tasks = await prisma.oSTask.findMany({
    where: { goalId, userId, status: { not: 'cancelled' } },
    select: { status: true },
  })
  if (tasks.length === 0) return
  const done = tasks.filter((t) => t.status === 'done').length
  const progress = done / tasks.length
  await prisma.goal.update({ where: { id: goalId }, data: { progress } })
}
