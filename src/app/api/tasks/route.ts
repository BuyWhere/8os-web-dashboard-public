/**
 * GET  /api/tasks   → list tasks (filter by date, status, projectId)
 * POST /api/tasks   → create task
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const CreateTaskSchema = z.object({
  name: z.string().min(1).max(500),
  notes: z.string().default(''),
  projectId: z.string().uuid().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
  domainId: z.string().optional().nullable(),
  duration: z.number().int().min(5).max(480).default(60),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  scheduledAt: z.string().datetime().optional().nullable(),
  energyRequired: z.enum(['green', 'yellow', 'red']).default('green'),
  recurrence: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']).default('none'),
  recurrenceUntil: z.string().datetime().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const projectId = searchParams.get('projectId')
  const goalId = searchParams.get('goalId')
  const dateFrom = searchParams.get('from')
  const dateTo = searchParams.get('to')

  const where: Record<string, unknown> = { userId: auth.userId }
  if (status) where.status = status
  if (projectId) where.projectId = projectId
  if (goalId) where.goalId = goalId
  if (dateFrom || dateTo) {
    where.scheduledAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    }
  }

  const tasks = await prisma.oSTask.findMany({
    where,
    orderBy: [{ scheduledAt: 'asc' }, { priority: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = CreateTaskSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null
  const scheduledEnd = scheduledAt ? new Date(scheduledAt.getTime() + data.duration * 60 * 1000) : null

  const task = await prisma.oSTask.create({
    data: {
      userId: auth.userId,
      name: data.name,
      notes: data.notes,
      projectId: data.projectId ?? null,
      goalId: data.goalId ?? null,
      domainId: data.domainId ?? null,
      duration: data.duration,
      priority: data.priority,
      scheduledAt,
      scheduledEnd,
      energyRequired: data.energyRequired,
      recurrence: data.recurrence,
      recurrenceUntil: data.recurrenceUntil ? new Date(data.recurrenceUntil) : null,
    },
  })

  // Create calendar event if scheduled
  if (scheduledAt && scheduledEnd) {
    await prisma.calendarEvent.create({
      data: {
        userId: auth.userId,
        taskId: task.id,
        title: task.name,
        startAt: scheduledAt,
        endAt: scheduledEnd,
        domainId: data.domainId ?? null,
      },
    })
  }

  await prisma.activityLog.create({
    data: { userId: auth.userId, taskId: task.id, action: 'task_created', metadata: { name: task.name } },
  })

  return NextResponse.json(task, { status: 201 })
}
