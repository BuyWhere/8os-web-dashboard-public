/**
 * GET /api/dashboard/today
 * Full "Today" view: today's scheduled tasks ordered by energy hours, the
 * user's current energy window, a capacity meter (scheduled minutes vs. a daily
 * capacity budget), the energy hourMap, and tasks deferred because the current
 * energy is too low.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { orderTasksByEnergyHours } from '@/lib/scheduling/engine'

type EnergyLevel = 'green' | 'yellow' | 'red'
type EnergyMap = Record<number, EnergyLevel>

const DEFAULT_ENERGY: EnergyMap = Object.fromEntries(
  Array.from({ length: 24 }, (_, i) => {
    if (i >= 9 && i <= 11) return [i, 'green']
    if (i >= 14 && i <= 16) return [i, 'green']
    if ((i >= 6 && i <= 8) || (i >= 13 && i <= 17)) return [i, 'yellow']
    return [i, 'red']
  }),
)

const ENERGY_RANK: Record<EnergyLevel, number> = { green: 3, yellow: 2, red: 1 }

/** A conservative daily capacity budget in minutes per energy tier. */
const CAPACITY_BUDGET: Record<EnergyLevel, number> = { green: 240, yellow: 180, red: 120 }

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const [energyProfile, todayTasksRaw, inboxRaw] = await Promise.all([
    prisma.energyProfile.findUnique({ where: { userId: auth.userId } }),
    prisma.oSTask.findMany({
      where: {
        userId: auth.userId,
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: { not: 'cancelled' },
      },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.oSTask.findMany({
      where: {
        userId: auth.userId,
        scheduledAt: null,
        status: { in: ['todo', 'in_progress'] },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  const hourMap = ((energyProfile?.hourMap as EnergyMap) ?? DEFAULT_ENERGY) as EnergyMap
  const currentHour = now.getHours()
  const currentEnergy: EnergyLevel = hourMap[currentHour] ?? 'yellow'

  // Order today's scheduled tasks by energy hours using the existing engine.
  const orderedIds = orderTasksByEnergyHours(
    todayTasksRaw.map((t) => ({
      id: t.id,
      scheduledAt: t.scheduledAt,
      energyRequired: t.energyRequired,
      priority: t.priority,
    })),
    hourMap,
  )
  const taskMap = new Map(todayTasksRaw.map((t) => [t.id, t]))
  const todayTasks = orderedIds.map((o) => taskMap.get(o.id)!).filter(Boolean)

  const todayPayload = todayTasks.map((t) => ({
    id: t.id,
    name: t.name,
    notes: t.notes,
    duration: t.duration,
    priority: t.priority,
    status: t.status,
    scheduledAt: t.scheduledAt?.toISOString() ?? null,
    energyRequired: (t.energyRequired as EnergyLevel) || 'green',
    domainId: t.domainId,
    goalId: t.goalId,
    completedAt: t.completedAt?.toISOString() ?? null,
  }))

  // Capacity meter: minutes scheduled in each energy tier vs. its budget.
  const scheduledMinutesByEnergy: Record<EnergyLevel, number> = { green: 0, yellow: 0, red: 0 }
  for (const t of todayPayload) {
    scheduledMinutesByEnergy[t.energyRequired] += t.duration
  }
  const capacity = {
    currentEnergy,
    scheduledMinutesByEnergy,
    budgetMinutesByEnergy: CAPACITY_BUDGET,
    totalScheduledMinutes: todayPayload.reduce((sum, t) => sum + t.duration, 0),
    totalBudgetMinutes: CAPACITY_BUDGET.green + CAPACITY_BUDGET.yellow + CAPACITY_BUDGET.red,
  }

  // Inbox items: which can be done now vs. deferred (energy too low right now).
  const currentRank = ENERGY_RANK[currentEnergy]
  const matched: typeof inboxRaw = []
  const deferred: typeof inboxRaw = []
  for (const t of inboxRaw) {
    const required = (t.energyRequired as EnergyLevel) || 'green'
    if (ENERGY_RANK[required] <= currentRank) matched.push(t)
    else deferred.push(t)
  }

  const mapInbox = (arr: typeof inboxRaw) =>
    arr.map((t) => ({
      id: t.id,
      name: t.name,
      notes: t.notes,
      duration: t.duration,
      priority: t.priority,
      energyRequired: (t.energyRequired as EnergyLevel) || 'green',
      domainId: t.domainId,
      goalId: t.goalId,
    }))

  return NextResponse.json({
    todayDate: now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    currentHour,
    currentEnergy,
    hourMap,
    todayTasks: todayPayload,
    capacity,
    inbox: {
      matchedToCurrentEnergy: mapInbox(matched),
      deferredLowEnergy: mapInbox(deferred),
    },
  })
}
