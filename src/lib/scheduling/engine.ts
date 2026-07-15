/**
 * Scheduling Intelligence Engine
 * Finds energy-hour slots, avoids conflicts, supports recurring tasks.
 */

export type EnergyLevel = 'green' | 'yellow' | 'red'
export type EnergyMap = Record<number, EnergyLevel> // hour 0-23

export interface ScheduledSlot {
  startAt: Date
  endAt: Date
  energyLevel: EnergyLevel
  conflictFree: boolean
}

export interface ExistingEvent {
  startAt: Date
  endAt: Date
}

const ENERGY_PRIORITY: Record<EnergyLevel, number> = { green: 3, yellow: 2, red: 1 }

/**
 * Find the best available slot for a task within a date range.
 * Prefers green hours, avoids conflicts, skips red hours for high-priority tasks.
 */
export function findBestSlot(params: {
  durationMinutes: number
  energyRequired: EnergyLevel
  energyMap: EnergyMap
  existingEvents: ExistingEvent[]
  searchFrom: Date
  searchDays?: number
}): ScheduledSlot | null {
  const { durationMinutes, energyRequired, energyMap, existingEvents, searchFrom, searchDays = 7 } = params
  const requiredPriority = ENERGY_PRIORITY[energyRequired]

  const candidates: ScheduledSlot[] = []

  for (let dayOffset = 0; dayOffset < searchDays; dayOffset++) {
    const baseDate = new Date(searchFrom)
    baseDate.setDate(baseDate.getDate() + dayOffset)
    baseDate.setHours(0, 0, 0, 0)

    for (let hour = 6; hour <= 22; hour++) {
      const slotEnergy = energyMap[hour] ?? 'red'
      const slotPriority = ENERGY_PRIORITY[slotEnergy]
      if (slotPriority < requiredPriority) continue

      const startAt = new Date(baseDate)
      startAt.setHours(hour, 0, 0, 0)
      const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000)

      // Skip if in the past
      if (startAt < searchFrom) continue

      // Check conflict
      const conflictFree = !existingEvents.some(
        (e) => startAt < e.endAt && endAt > e.startAt
      )

      candidates.push({ startAt, endAt, energyLevel: slotEnergy, conflictFree })
    }
  }

  // Sort: conflict-free first, then by energy priority desc, then by time asc
  candidates.sort((a, b) => {
    if (a.conflictFree !== b.conflictFree) return a.conflictFree ? -1 : 1
    const ePriority = ENERGY_PRIORITY[b.energyLevel] - ENERGY_PRIORITY[a.energyLevel]
    if (ePriority !== 0) return ePriority
    return a.startAt.getTime() - b.startAt.getTime()
  })

  return candidates[0] ?? null
}

/**
 * Generate recurring task instances from a base task.
 */
export function generateRecurrences(params: {
  baseDate: Date
  rule: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  until: Date
  durationMinutes: number
}): Array<{ startAt: Date; endAt: Date }> {
  const { baseDate, rule, until, durationMinutes } = params
  const results: Array<{ startAt: Date; endAt: Date }> = []
  let current = new Date(baseDate)

  const advance = () => {
    if (rule === 'daily') current.setDate(current.getDate() + 1)
    else if (rule === 'weekly') current.setDate(current.getDate() + 7)
    else if (rule === 'biweekly') current.setDate(current.getDate() + 14)
    else if (rule === 'monthly') current.setMonth(current.getMonth() + 1)
  }

  advance() // skip the base occurrence
  while (current <= until && results.length < 52) {
    const startAt = new Date(current)
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000)
    results.push({ startAt, endAt })
    advance()
  }
  return results
}

/**
 * Order tasks by energy-hour fit for today.
 * Returns tasks sorted: green-hour tasks first, then yellow, then unscheduled.
 */
export function orderTasksByEnergyHours(
  tasks: Array<{ id: string; scheduledAt: Date | null; energyRequired: string; priority: string }>,
  energyMap: EnergyMap
): typeof tasks {
  const now = new Date()
  const currentHour = now.getHours()

  return [...tasks].sort((a, b) => {
    // Completed-first not needed here (filter before calling)
    const aHour = a.scheduledAt?.getHours() ?? -1
    const bHour = b.scheduledAt?.getHours() ?? -1
    const aEnergy = aHour >= 0 ? (energyMap[aHour] ?? 'red') : 'red'
    const bEnergy = bHour >= 0 ? (energyMap[bHour] ?? 'red') : 'red'

    const aPriority = ENERGY_PRIORITY[aEnergy as EnergyLevel]
    const bPriority = ENERGY_PRIORITY[bEnergy as EnergyLevel]
    if (aPriority !== bPriority) return bPriority - aPriority

    // Closer to current hour wins
    const aDist = aHour >= 0 ? Math.abs(aHour - currentHour) : 999
    const bDist = bHour >= 0 ? Math.abs(bHour - currentHour) : 999
    return aDist - bDist
  })
}
