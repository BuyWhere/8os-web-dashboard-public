/**
 * POST /api/tasks/[id]/reschedule
 * Move a task to a specific new start datetime. Required: `scheduledAt` (ISO).
 * Optional: `duration` (override minutes). Calendar event re-synced.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const RescheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
  duration: z.number().int().min(5).max(480).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const task = await prisma.oSTask.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = RescheduleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const start = new Date(parsed.data.scheduledAt)
  const duration = parsed.data.duration ?? task.duration
  const end = new Date(start.getTime() + duration * 60_000)

  const updated = await prisma.oSTask.update({
    where: { id: task.id },
    data: {
      scheduledAt: start,
      scheduledEnd: end,
      duration,
      updatedAt: new Date(),
    },
  })

  await prisma.calendarEvent.deleteMany({ where: { taskId: task.id } })
  await prisma.calendarEvent.create({
    data: {
      userId: auth.userId,
      taskId: task.id,
      title: updated.name,
      startAt: start,
      endAt: end,
      domainId: updated.domainId,
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: auth.userId,
      taskId: task.id,
      action: 'task_rescheduled',
      metadata: { scheduledAt: start.toISOString() },
    },
  })

  return NextResponse.json(updated)
}
