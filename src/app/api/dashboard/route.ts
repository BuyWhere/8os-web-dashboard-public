/**
 * GET /api/dashboard
 * Returns all data needed to render the dashboard in one request:
 * user, archetype, goals w/ progress, today's tasks ordered by energy,
 * metrics, upcoming calendar events.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { orderTasksByEnergyHours } from '@/lib/scheduling/engine'

const DEFAULT_ENERGY: Record<number, 'green' | 'yellow' | 'red'> = Object.fromEntries(
  Array.from({ length: 24 }, (_, i) => {
    if (i >= 9 && i <= 11) return [i, 'green']
    if (i >= 14 && i <= 16) return [i, 'green']
    if ((i >= 6 && i <= 8) || (i >= 13 && i <= 17)) return [i, 'yellow']
    return [i, 'red']
  })
)

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const userId = auth.userId
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)

  const [user, archetype, goalsRaw, todayTasksRaw, energyProfileRaw, settings, upcomingEvents, recentActivity] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, profile: { select: { dayElement: true, dominantElement: true, dayPolarity: true } } },
      }),
      prisma.archetypeResult.findUnique({ where: { userId } }),
      prisma.goal.findMany({
        where: { userId, status: 'active' },
        include: { projects: { select: { id: true, name: true, accepted: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.oSTask.findMany({
        where: { userId, scheduledAt: { gte: todayStart, lte: todayEnd }, status: { not: 'cancelled' } },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.energyProfile.findUnique({ where: { userId } }),
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.calendarEvent.findMany({
        where: { userId, startAt: { gte: now, lte: weekEnd } },
        orderBy: { startAt: 'asc' },
        take: 10,
      }),
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, action: true, metadata: true, createdAt: true, goalId: true, taskId: true },
      }),
    ])

  const energyMap = (energyProfileRaw?.hourMap as Record<number, 'green' | 'yellow' | 'red'>) ?? DEFAULT_ENERGY

  // Order today's tasks by energy hours
  const todayTasksOrdered = orderTasksByEnergyHours(
    todayTasksRaw.map((t) => ({
      id: t.id,
      scheduledAt: t.scheduledAt,
      energyRequired: t.energyRequired,
      priority: t.priority,
    })),
    energyMap
  )
  const todayTaskMap = new Map(todayTasksRaw.map((t) => [t.id, t]))
  const todayTasks = todayTasksOrdered.map((t) => todayTaskMap.get(t.id)!)

  // Metrics
  const [completedThisWeek, totalTasks, streakDays] = await Promise.all([
    prisma.oSTask.count({ where: { userId, completedAt: { gte: new Date(now.getTime() - 7 * 86400000) } } }),
    prisma.oSTask.count({ where: { userId } }),
    computeStreak(userId),
  ])

  // Unscheduled tasks (backlog)
  const backlog = await prisma.oSTask.findMany({
    where: { userId, scheduledAt: null, status: 'todo' },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    take: 5,
  })

  return NextResponse.json({
    user,
    archetype,
    goals: goalsRaw,
    todayTasks,
    backlog,
    energyMap,
    settings,
    upcomingEvents,
    recentActivity,
    metrics: {
      completedThisWeek,
      totalTasks,
      streakDays,
      activeGoals: goalsRaw.length,
    },
  })
}

async function computeStreak(userId: string): Promise<number> {
  const logs = await prisma.activityLog.findMany({
    where: { userId, action: 'task_completed' },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: { createdAt: true },
  })

  if (logs.length === 0) return 0

  const days = new Set(logs.map((l) => l.createdAt.toISOString().slice(0, 10)))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 60; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (days.has(key)) streak++
    else if (i > 0) break
  }
  return streak
}
