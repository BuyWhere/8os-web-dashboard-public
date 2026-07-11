import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { getDailyInsight } from '@/lib/deepseek/insights'

const STALL_THRESHOLD_DAYS = 7
const AT_RISK_PROGRESS_THRESHOLD = 0.15

/** Compute accountability pulse from active goals. */
export function computeAccountabilityPulse(goals: { id: string; name: string; progress: number; updatedAt: Date; domainId: string }[]) {
  const now = Date.now()
  const stallMs = STALL_THRESHOLD_DAYS * 86400000
  const atRiskMs = 3 * 86400000

  const stalled: { id: string; name: string; daysSinceUpdate: number; domainId: string }[] = []
  const atRisk: { id: string; name: string; progress: number; daysSinceUpdate: number }[] = []

  for (const goal of goals) {
    const daysSinceUpdate = Math.floor((now - goal.updatedAt.getTime()) / 86400000)

    if (goal.progress < 1 && daysSinceUpdate >= STALL_THRESHOLD_DAYS) {
      stalled.push({ id: goal.id, name: goal.name, daysSinceUpdate, domainId: goal.domainId })
    } else if (goal.progress < AT_RISK_PROGRESS_THRESHOLD && daysSinceUpdate >= 3) {
      atRisk.push({ id: goal.id, name: goal.name, progress: goal.progress, daysSinceUpdate })
    }
  }

  const archetypeNudge = stalled.length > 0
    ? `You've got ${stalled.length} goal${stalled.length > 1 ? 's' : ''} that ${stalled.length === 1 ? 'has' : 'have'} been waiting — time to check in and move forward.`
    : null

  const summary = {
    stalledGoalCount: stalled.length,
    atRiskGoalCount: atRisk.length,
  }

  return {
    summary,
    stalledGoals: stalled.map(g => ({ id: g.id, name: g.name, daysSinceUpdate: g.daysSinceUpdate })),
    atRiskGoals: atRisk.map(g => ({ id: g.id, name: g.name, progress: g.progress, daysSinceUpdate: g.daysSinceUpdate })),
    archetypeNudge,
    followUpPrompt: stalled.length > 0
      ? `Which goal would you like to make progress on today? (You have ${stalled.length} stalled goal${stalled.length > 1 ? 's' : ''})`
      : atRisk.length > 0
      ? `You have ${atRisk.length} goal${atRisk.length > 1 ? 's' : ''} at risk. Want to do a quick check-in?`
      : null,
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const userId = auth.userId
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  try {
    const [archetype, goals, todayTasks, upcomingEvents, userProfile] = await Promise.all([
      prisma.archetypeResult.findUnique({ where: { userId } }),
      prisma.goal.findMany({ where: { userId, status: 'active' }, orderBy: { createdAt: 'asc' }, take: 20 }),
      prisma.oSTask.findMany({
        where: {
          userId,
          scheduledAt: { gte: todayStart, lte: todayEnd },
          status: { not: 'cancelled' },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.calendarEvent.findMany({
        where: { userId, startAt: { gte: now, lte: new Date(Date.now() + 86400000) } },
        orderBy: { startAt: 'asc' },
        take: 10,
      }),
      prisma.userProfile.findUnique({ where: { userId }, select: { birthTimezone: true } }),
    ])

    const insight = await getDailyInsight(userId, userProfile?.birthTimezone ?? 'UTC')
    const todayDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const accountabilityPulse = computeAccountabilityPulse(goals)

    return NextResponse.json({
      todayDate,
      archetype: archetype
        ? {
            archetypeId: archetype.archetypeId,
            archetypeName: archetype.archetypeName,
            skinArchetypeId:
              ((archetype.calculationLog as Record<string, unknown> | null)?.skinArchetypeId as string | undefined) ?? null,
          }
        : null,
      insight,
      todayTasks: todayTasks.map((task) => ({
        id: task.id,
        name: task.name,
        priority: task.priority,
        status: task.status,
        scheduledAt: task.scheduledAt?.toISOString() ?? null,
        duration: task.duration,
      })),
      upcomingEvents: upcomingEvents.map((event) => ({
        id: event.id,
        title: event.title,
        startAt: event.startAt.toISOString(),
        color: event.color,
      })),
      goals: goals.slice(0, 5).map((goal) => ({
        id: goal.id,
        name: goal.name,
        progress: goal.progress,
      })),
      accountabilityPulse,
    })
  } catch (error) {
    console.error('[/api/dashboard/briefing GET]', error)
    return NextResponse.json({ error: 'Failed to load your daily briefing.' }, { status: 500 })
  }
}
