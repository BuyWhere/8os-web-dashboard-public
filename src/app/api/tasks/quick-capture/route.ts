/**
 * POST /api/tasks/quick-capture
 * Fast inline task creation. Required: name. Optional: priority, energyLevel,
 * duration, domainId. Created tasks are unscheduled (land in the inbox).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const energyFromPriority = (priority: string): 'green' | 'yellow' | 'red' => {
  if (priority === 'high') return 'green'
  if (priority === 'medium') return 'yellow'
  return 'red'
}

const QuickCaptureSchema = z.object({
  name: z.string().min(1).max(500),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  energyLevel: z.enum(['green', 'yellow', 'red']).optional(),
  duration: z.number().int().min(5).max(480).default(30),
  domainId: z.string().optional().nullable(),
  notes: z.string().default(''),
})

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = QuickCaptureSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, priority, energyLevel, duration, domainId, notes } = parsed.data
  const energyRequired = energyLevel ?? energyFromPriority(priority)

  const task = await prisma.oSTask.create({
    data: {
      userId: auth.userId,
      name,
      notes,
      duration,
      priority,
      energyRequired,
      domainId: domainId ?? null,
      status: 'todo',
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: auth.userId,
      taskId: task.id,
      action: 'task_created',
      metadata: { source: 'quick_capture', name },
    },
  })

  return NextResponse.json(task, { status: 201 })
}
