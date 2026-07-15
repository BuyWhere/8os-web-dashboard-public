/**
 * GET   /api/tasks/[id]   → single task
 * PATCH /api/tasks/[id]   → update (status, scheduledAt, etc.)
 * DELETE /api/tasks/[id]  → cancel
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  notes: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  duration: z.number().int().min(5).max(480).optional(),
  energyRequired: z.enum(['green', 'yellow', 'red']).optional(),
})

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

  if (parsed.data.scheduledAt !== undefined) {
    const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null
    const duration = parsed.data.duration ?? task.duration
    update.scheduledAt = scheduledAt
    update.scheduledEnd = scheduledAt ? new Date(scheduledAt.getTime() + duration * 60 * 1000) : null
  }

  if (parsed.data.status === 'done' && task.status !== 'done') {
    update.completedAt = new Date()
    // Log completion
    await prisma.activityLog.create({
      data: { userId: auth.userId, taskId: task.id, action: 'task_completed', metadata: { name: task.name } },
    })
    // Update parent goal progress
    if (task.goalId) await recomputeGoalProgress(task.goalId, auth.userId)
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

  return NextResponse.json(updated)
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
