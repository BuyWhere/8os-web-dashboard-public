import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { getDailyInsight } from '@/lib/deepseek/insights'
import { computeAccountabilityPulse } from '@/app/api/dashboard/briefing/route'

/**
 * GET /api/briefing/today
 *
 * Flow-AI agent contract adapter. The dashboard already consumes
 * /api/dashboard/briefing; this route exposes the same live data in a stable,
 * action-oriented shape for external Flow agent turns.
 */
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
        where: { userId, scheduledAt: { gte: todayStart, lte: todayEnd }, status: { not: 'cancelled' } },
        orderBy: { scheduledAt: 'asc' },
        take: 50,
      }),
      prisma.calendarEvent.findMany({
        where: { userId, startAt: { gte: now, lte: new Date(Date.now() + 86400000) } },
        orderBy: { startAt: 'asc' },
        take: 20,
      }),
      prisma.userProfile.findUnique({ where: { userId }, select: { birthTimezone: true } }),
    ])

    const insight = await getDailyInsight(userId, userProfile?.birthTimezone ?? 'UTC')
    const accountabilityPulse = computeAccountabilityPulse(goals)

    return NextResponse.json({
      contract: 'flow-ai.briefing.today.v1',
      generatedAt: now.toISOString(),
      todayDate: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      archetype: archetype
        ? {
            archetypeId: archetype.archetypeId,
            archetypeName: archetype.archetypeName,
            skinArchetypeId: ((archetype.calculationLog as Record<string, unknown> | null)?.skinArchetypeId as string | undefined) ?? null,
          }
        : null,
      insight,
      focus: {
        goals: goals.slice(0, 5).map((goal) => ({ id: goal.id, name: goal.name, progress: goal.progress })),
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
          endAt: event.endAt.toISOString(),
          color: event.color,
        })),
      },
      accountabilityPulse,
      actions: {
        endpoint: '/api/briefing/action',
        supported: ['complete_task', 'snooze_task', 'start_task'],
      },
    })
  } catch (error) {
    console.error('[/api/briefing/today GET]', error)
    return NextResponse.json({ error: 'Failed to load today briefing.' }, { status: 500 })
  }
}
