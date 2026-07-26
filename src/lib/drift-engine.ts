/**
 * Drift Detection + Coaching Engine
 *
 * Detects 6 types of drift signals from alignment + calendar + task data and
 * generates archetype-appropriate coaching nudges.
 *
 * Signal Types:
 * - goal_abandonment: goal share dropped to ~0 while momentum was previously positive
 * - priority_inversion: actual share far below expected share for top-ranked goals
 * - calendar_mismatch: significant blocked time vs actual goal attention
 * - streak_break: attention ledger gap patterns with no recent activity
 * - completion_rate_drop: task completion trends between halves of the window
 * - scope_creep: many new tasks created without completing older goal-bound tasks
 */

import { AlignmentResult, computeAlignment } from './alignment-engine'
import { prisma } from '@/lib/db/prisma'
import { generateCoachingNudges } from './coaching-engine'

// ─── Types ───────────────────────────────────────────────────────────────────

export type DriftSignalType =
  | 'goal_abandonment'
  | 'priority_inversion'
  | 'calendar_mismatch'
  | 'streak_break'
  | 'completion_rate_drop'
  | 'scope_creep'

export interface DriftSignal {
  type: DriftSignalType
  severity: 'low' | 'medium' | 'high'
  goalId?: string
  goalName?: string
  message: string
  evidence: Record<string, unknown>
  detectedAt: string
}

export interface CoachingNudge {
  id: string
  signalType: DriftSignalType
  archetypeId: string
  title: string
  message: string
  suggestedAction?: string
  cta?: string
  tone: 'supportive' | 'direct' | 'challenging'
  priority: number // 1 = highest
}

export interface DriftScanResult {
  signals: DriftSignal[]
  nudges: CoachingNudge[]
  summary: {
    totalSignals: number
    highCount: number
    mediumCount: number
    lowCount: number
  }
}

// ─── Drift Detection ────────────────────────────────────────────────────────

export async function detectDriftSignals(
  userId: string,
  windowDays: number = 14
): Promise<DriftSignal[]> {
  // Fetch alignment twice (current window vs wider window so we get a "before"
  // snapshot for comparison), tasks in the window, and calendar events.
  const [currentAlignment, previousAlignment, tasks, calendarEvents] = await Promise.all([
    computeAlignment(userId, { days: windowDays }),
    computeAlignment(userId, { days: windowDays * 2 }),
    prisma.oSTask.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - windowDays * 2 * 86400000) },
      },
      select: { id: true, status: true, goalId: true, completedAt: true, createdAt: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        startAt: { gte: new Date(Date.now() - windowDays * 86400000) },
      },
      select: { id: true, goalId: true, startAt: true, endAt: true },
    }),
  ])

  const signals: DriftSignal[] = []
  signals.push(...detectGoalAbandonment(currentAlignment, previousAlignment))
  signals.push(...detectPriorityInversion(currentAlignment))
  signals.push(...detectCalendarMismatch(calendarEvents, currentAlignment))
  signals.push(...await detectStreakBreak(userId, windowDays))
  signals.push(...detectCompletionRateDrop(tasks, windowDays))
  signals.push(...detectScopeCreep(tasks, windowDays))

  const severityOrder = { high: 0, medium: 1, low: 2 }
  return signals.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

function detectGoalAbandonment(
  current: AlignmentResult,
  previous: AlignmentResult
): DriftSignal[] {
  const signals: DriftSignal[] = []
  const detectedAt = new Date().toISOString()

  const currentGoals = new Map(current.weekly?.perGoal?.map((g) => [g.goalId, g]) ?? [])
  const previousGoals = new Map(previous.weekly?.perGoal?.map((g) => [g.goalId, g]) ?? [])

  for (const [goalId, currentGoal] of Array.from(currentGoals)) {
    const prevGoal = previousGoals.get(goalId)
    if (!prevGoal) continue

    const wasActive = prevGoal.share > 0.05 && prevGoal.momentum !== 'starving'
    const nowAbandoned = currentGoal.share < 0.02
    if (!wasActive || !nowAbandoned) continue

    const shareDrop = prevGoal.share - currentGoal.share
    signals.push({
      type: 'goal_abandonment',
      severity: shareDrop > 0.3 ? 'high' : shareDrop > 0.15 ? 'medium' : 'low',
      goalId,
      goalName: currentGoal.name,
      message: `"${currentGoal.name}" received ${Math.round(currentGoal.share * 100)}% attention recently vs ${Math.round(prevGoal.share * 100)}% before — appears abandoned.`,
      evidence: {
        previousShare: prevGoal.share,
        currentShare: currentGoal.share,
        previousMomentum: prevGoal.momentum,
        dropMagnitude: shareDrop,
      },
      detectedAt,
    })
  }
  return signals
}

function detectPriorityInversion(current: AlignmentResult): DriftSignal[] {
  const signals: DriftSignal[] = []
  const detectedAt = new Date().toISOString()
  const goals = current.weekly?.perGoal ?? []

  for (const goal of goals) {
    // Only flag inversion for top-5 ranked goals (lower-priority goals get more slack)
    if (goal.rank > 5) continue
    const inversion = goal.expectedShare - goal.share
    if (inversion <= 0.2) continue

    signals.push({
      type: 'priority_inversion',
      severity: inversion > 0.5 ? 'high' : inversion > 0.35 ? 'medium' : 'low',
      goalId: goal.goalId,
      goalName: goal.name,
      message: `"${goal.name}" ranks #${goal.rank} but gets only ${Math.round(goal.share * 100)}% attention vs expected ${Math.round(goal.expectedShare * 100)}%.`,
      evidence: {
        rank: goal.rank,
        expectedShare: goal.expectedShare,
        actualShare: goal.share,
        inversionMagnitude: inversion,
      },
      detectedAt,
    })
  }
  return signals
}

function detectCalendarMismatch(
  calendarEvents: { goalId: string | null; startAt: Date; endAt: Date }[],
  alignment: AlignmentResult
): DriftSignal[] {
  const signals: DriftSignal[] = []
  const detectedAt = new Date().toISOString()

  // Aggregate calendar time per goal
  const calendarByGoal = new Map<string, number>()
  for (const event of calendarEvents) {
    if (!event.goalId) continue
    const minutes = Math.max(
      0,
      Math.round((event.endAt.getTime() - event.startAt.getTime()) / 60000)
    )
    calendarByGoal.set(event.goalId, (calendarByGoal.get(event.goalId) ?? 0) + minutes)
  }

  const goals = alignment.weekly?.perGoal ?? []
  for (const goal of goals) {
    const calendarMinutes = calendarByGoal.get(goal.goalId) ?? 0
    const ledgerMinutes = goal.minutes
    if (calendarMinutes <= 60 || ledgerMinutes >= 15) continue

    signals.push({
      type: 'calendar_mismatch',
      severity: calendarMinutes > 180 ? 'high' : calendarMinutes > 90 ? 'medium' : 'low',
      goalId: goal.goalId,
      goalName: goal.name,
      message: `You blocked ${Math.round(calendarMinutes)}min on "${goal.name}" but only spent ${ledgerMinutes}min on it.`,
      evidence: {
        calendarMinutes,
        ledgerMinutes,
        mismatchRatio: ledgerMinutes > 0 ? calendarMinutes / ledgerMinutes : null,
      },
      detectedAt,
    })
  }
  return signals
}

async function detectStreakBreak(userId: string, windowDays: number): Promise<DriftSignal[]> {
  const signals: DriftSignal[] = []
  const detectedAt = new Date().toISOString()

  const since = new Date(Date.now() - windowDays * 86400000)
  const ledger = await prisma.attentionLedger.findMany({
    where: { userId, day: { gte: since } },
    select: { day: true },
    orderBy: { day: 'asc' },
  })

  const daysWithActivity = new Set<string>()
  for (const entry of ledger) {
    if (entry.day) daysWithActivity.add(entry.day.toISOString().split('T')[0])
  }

  const sortedDays = Array.from(daysWithActivity).sort().slice(-windowDays)
  if (sortedDays.length < 2) return signals

  const today = new Date()
  const lastActive = new Date(sortedDays[sortedDays.length - 1])
  const daysSinceLastActive = Math.floor((today.getTime() - lastActive.getTime()) / 86400000)

  if (daysSinceLastActive < 3) return signals

  signals.push({
    type: 'streak_break',
    severity: daysSinceLastActive >= 7 ? 'high' : daysSinceLastActive >= 5 ? 'medium' : 'low',
    message: `No activity logged in ${daysSinceLastActive} days. Your streak may be breaking.`,
    evidence: {
      lastActiveDate: sortedDays[sortedDays.length - 1],
      daysSinceLastActive,
    },
    detectedAt,
  })

  return signals
}

function detectCompletionRateDrop(
  tasks: { status: string; completedAt: Date | null; createdAt: Date; goalId: string | null }[],
  windowDays: number
): DriftSignal[] {
  const signals: DriftSignal[] = []
  const detectedAt = new Date().toISOString()

  const midPoint = Date.now() - (windowDays / 2) * 86400000
  const recentTasks = tasks.filter((t) => t.createdAt.getTime() >= midPoint)
  const olderTasks = tasks.filter((t) => t.createdAt.getTime() < midPoint)

  if (recentTasks.length < 3 || olderTasks.length < 3) return signals

  const recentCompletionRate =
    recentTasks.filter((t) => t.status === 'completed').length / recentTasks.length
  const olderCompletionRate =
    olderTasks.filter((t) => t.status === 'completed').length / olderTasks.length

  const drop = olderCompletionRate - recentCompletionRate
  if (drop <= 0.2) return signals

  signals.push({
    type: 'completion_rate_drop',
    severity: drop > 0.4 ? 'high' : drop > 0.3 ? 'medium' : 'low',
    message: `Completion rate dropped from ${Math.round(olderCompletionRate * 100)}% to ${Math.round(recentCompletionRate * 100)}%.`,
    evidence: {
      olderCompletionRate,
      recentCompletionRate,
      dropMagnitude: drop,
      recentTaskCount: recentTasks.length,
      olderTaskCount: olderTasks.length,
    },
    detectedAt,
  })

  return signals
}

function detectScopeCreep(
  tasks: { status: string; createdAt: Date; goalId: string | null }[],
  windowDays: number
): DriftSignal[] {
  const signals: DriftSignal[] = []
  const detectedAt = new Date().toISOString()

  const midPoint = Date.now() - (windowDays / 2) * 86400000
  const recentGoalIds = new Set<string>()
  const olderGoalIds = new Set<string>()
  for (const t of tasks) {
    if (!t.goalId) continue
    if (t.createdAt.getTime() >= midPoint) recentGoalIds.add(t.goalId)
    else olderGoalIds.add(t.goalId)
  }

  const newGoalsWithoutOldCompletion: string[] = []
  for (const id of Array.from(recentGoalIds)) {
    if (!olderGoalIds.has(id)) newGoalsWithoutOldCompletion.push(id)
  }
  if (newGoalsWithoutOldCompletion.length < 2) return signals

  // Count older tasks that remain incomplete
  const olderIncompleteCount = tasks.filter(
    (t) => t.createdAt.getTime() < midPoint && t.status !== 'completed' && t.goalId
  ).length

  if (olderIncompleteCount < 3) return signals

  signals.push({
    type: 'scope_creep',
    severity:
      newGoalsWithoutOldCompletion.length >= 4
        ? 'high'
        : newGoalsWithoutOldCompletion.length >= 3
          ? 'medium'
          : 'low',
    message: `Added ${newGoalsWithoutOldCompletion.length} new goals while ${olderIncompleteCount} older tasks remain incomplete.`,
    evidence: {
      newGoalsAdded: newGoalsWithoutOldCompletion.length,
      olderIncompleteCount,
    },
    detectedAt,
  })

  return signals
}

// ─── Full Scan ──────────────────────────────────────────────────────────────

export async function performDriftScan(
  userId: string,
  archetypeId: string = 'pioneer',
  windowDays: number = 14
): Promise<DriftScanResult> {
  const signals = await detectDriftSignals(userId, windowDays)
  const nudges = generateCoachingNudges(signals, userId, archetypeId)

  return {
    signals,
    nudges,
    summary: {
      totalSignals: signals.length,
      highCount: signals.filter((s) => s.severity === 'high').length,
      mediumCount: signals.filter((s) => s.severity === 'medium').length,
      lowCount: signals.filter((s) => s.severity === 'low').length,
    },
  }
}
