/**
 * GET /api/inbox
 * Returns unscheduled tasks (scheduledAt == null) that are not cancelled/done,
 * each tagged with an inferred energy level derived from priority, grouped by
 * priority and energy. Sorted by priority then createdAt.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'

type EnergyLevel = 'green' | 'yellow' | 'red'

/** Map task priority to the energy window it belongs in. */
export function energyFromPriority(priority: string): EnergyLevel {
  switch (priority) {
    case 'high':
      return 'green'
    case 'medium':
      return 'yellow'
    case 'low':
    default:
      return 'red'
  }
}

const ENERGY_RANK: Record<EnergyLevel, number> = { green: 0, yellow: 1, red: 2 }
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const tasks = await prisma.oSTask.findMany({
    where: {
      userId: auth.userId,
      scheduledAt: null,
      status: { in: ['todo', 'in_progress'] },
    },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })

  const items = tasks.map((t) => {
    const energy = (t.energyRequired as EnergyLevel) || energyFromPriority(t.priority)
    return {
      id: t.id,
      name: t.name,
      notes: t.notes,
      duration: t.duration,
      priority: t.priority,
      energyRequired: energy,
      domainId: t.domainId,
      projectId: t.projectId,
      projectName: t.project?.name ?? null,
      goalId: t.goalId,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }
  })

  // Stable sort: priority first, then energy window
  items.sort((a, b) => {
    const pr = (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3)
    if (pr !== 0) return pr
    return (ENERGY_RANK[a.energyRequired] ?? 3) - (ENERGY_RANK[b.energyRequired] ?? 3)
  })

  const byEnergy: Record<EnergyLevel, typeof items> = { green: [], yellow: [], red: [] }
  for (const it of items) byEnergy[it.energyRequired].push(it)

  return NextResponse.json({
    count: items.length,
    tasks: items,
    byEnergy: {
      green: byEnergy.green,
      yellow: byEnergy.yellow,
      red: byEnergy.red,
    },
  })
}
