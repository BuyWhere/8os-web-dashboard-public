/**
 * POST /api/goals/[id]/convert-to-task — reclassify a mis-filed goal as a task.
 *
 * Creates an OSTask from the goal (name + definition→notes + domain) and
 * archives the goal, in one transaction. Returns the new task id so the client
 * can jump to /dashboard/tasks. userId-scoped (requireAuth).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const goal = await prisma.goal.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const task = await prisma.$transaction(async (tx) => {
    const t = await tx.oSTask.create({
      data: {
        userId: auth.userId,
        name: goal.name,
        notes: goal.definition ?? '',
        domainId: goal.domainId ?? null,
        duration: 30,
        priority: 'medium',
        energyRequired: 'green',
        recurrence: 'none',
        status: 'todo',
      },
    })
    await tx.goal.update({ where: { id: goal.id }, data: { status: 'archived', updatedAt: new Date() } })
    return t
  })

  await prisma.activityLog.create({
    data: { userId: auth.userId, goalId: goal.id, action: 'goal_converted_to_task', metadata: { taskId: task.id, name: goal.name } },
  }).catch(() => {})

  return NextResponse.json({ ok: true, taskId: task.id })
}
