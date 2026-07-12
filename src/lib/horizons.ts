/**
 * Time-horizon goals — shared constants + near-term reminder logic.
 *
 * People carry goals across different time scales: this-week actions all the
 * way out to a five-year vision. They are DIFFERENT things that live together.
 * A goal's `horizon` says which scale it belongs to; an optional `targetDate`
 * pins a concrete deadline that powers "days left" reminders.
 *
 * This module is framework-agnostic (no React, no Prisma) so it can be used by
 * the goals page, the API, the dashboard/brief, and the alignment engine.
 */

export const HORIZONS = ['weekly', 'monthly', 'quarterly', 'yearly', 'three_year', 'five_year'] as const
export type Horizon = (typeof HORIZONS)[number]

export const DEFAULT_HORIZON: Horizon = 'yearly'

/** Ordered near-term → long-term (drives section order + attention weighting). */
export const HORIZON_ORDER: Record<Horizon, number> = {
  weekly: 0, monthly: 1, quarterly: 2, yearly: 3, three_year: 4, five_year: 5,
}

export const HORIZON_LABELS: Record<Horizon, string> = {
  weekly: 'This week',
  monthly: 'This month',
  quarterly: 'This quarter',
  yearly: 'This year',
  three_year: '3-year',
  five_year: '5-year',
}

/** Short noun for a single goal of this horizon (used in copy). */
export const HORIZON_NOUN: Record<Horizon, string> = {
  weekly: 'weekly goal',
  monthly: 'monthly goal',
  quarterly: 'quarterly goal',
  yearly: 'yearly goal',
  three_year: '3-year goal',
  five_year: '5-year goal',
}

/** Nominal length of each horizon window, in days (for progress-vs-time). */
export const HORIZON_WINDOW_DAYS: Record<Horizon, number> = {
  weekly: 7, monthly: 30, quarterly: 91, yearly: 365, three_year: 1095, five_year: 1825,
}

/** "Near-term" horizons get active reminders + next-action surfacing. */
export const NEAR_TERM_HORIZONS: Horizon[] = ['weekly', 'monthly']

export function isHorizon(v: unknown): v is Horizon {
  return typeof v === 'string' && (HORIZONS as readonly string[]).includes(v)
}

export function normalizeHorizon(v: unknown): Horizon {
  return isHorizon(v) ? v : DEFAULT_HORIZON
}

export function isNearTerm(h: Horizon): boolean {
  return NEAR_TERM_HORIZONS.includes(h)
}

/** Days remaining until targetDate (negative = overdue). null if no date. */
export function daysLeft(targetDate: Date | string | null | undefined, now: Date = new Date()): number | null {
  if (!targetDate) return null
  const t = typeof targetDate === 'string' ? new Date(targetDate) : targetDate
  if (isNaN(t.getTime())) return null
  const ms = t.getTime() - now.getTime()
  return Math.ceil(ms / 86_400_000)
}

export interface HorizonGoalInput {
  name: string
  horizon: Horizon
  progress: number // 0..1
  targetDate: Date | string | null | undefined
  createdAt: Date | string
  totalTasks: number
  doneTasks: number
  nextTaskName?: string | null
}

export interface GoalReminder {
  /** urgency for sorting/coloring: 'overdue' | 'due-soon' | 'on-track' | 'break-down' */
  level: 'overdue' | 'due-soon' | 'on-track' | 'break-down'
  /** one-line, honest, derived from real data */
  message: string
  daysLeft: number | null
  /** true when the goal has no tasks and needs to be broken down */
  needsBreakdown: boolean
}

/**
 * Build a concise, honest reminder for a near-term (weekly/monthly) goal.
 * Everything is derived from real data: task counts, target-date proximity,
 * and progress vs. the elapsed fraction of the horizon window.
 *
 * Returns null for non-near-term goals or completed goals (nothing to nag).
 */
export function buildGoalReminder(g: HorizonGoalInput, now: Date = new Date()): GoalReminder | null {
  if (!isNearTerm(g.horizon)) return null
  if (g.progress >= 1) return null

  const dl = daysLeft(g.targetDate, now)
  const noun = HORIZON_NOUN[g.horizon]

  // No tasks under the goal → it isn't actionable yet. Prompt a breakdown.
  if (g.totalTasks === 0) {
    return {
      level: 'break-down',
      message: `No tasks yet — break this ${noun} into concrete next actions.`,
      daysLeft: dl,
      needsBreakdown: true,
    }
  }

  const remaining = g.totalTasks - g.doneTasks
  const nextBit = g.nextTaskName ? ` Next: “${g.nextTaskName}”.` : ''

  // Overdue against an explicit target date.
  if (dl !== null && dl < 0) {
    return {
      level: 'overdue',
      message: `${Math.abs(dl)}d overdue · ${remaining} task${remaining === 1 ? '' : 's'} left.${nextBit}`,
      daysLeft: dl,
      needsBreakdown: false,
    }
  }

  // Due soon (explicit date within the near-term window).
  if (dl !== null && dl <= (g.horizon === 'weekly' ? 3 : 7)) {
    return {
      level: 'due-soon',
      message: `${dl}d left · ${remaining} of ${g.totalTasks} task${g.totalTasks === 1 ? '' : 's'} to go.${nextBit}`,
      daysLeft: dl,
      needsBreakdown: false,
    }
  }

  // No explicit date → judge pace by elapsed fraction of the horizon window.
  const created = typeof g.createdAt === 'string' ? new Date(g.createdAt) : g.createdAt
  const elapsedDays = Math.max(0, (now.getTime() - created.getTime()) / 86_400_000)
  const windowDays = HORIZON_WINDOW_DAYS[g.horizon]
  const elapsedFrac = Math.min(1, elapsedDays / windowDays)

  // Behind: significantly more time elapsed than progress made.
  if (elapsedFrac - g.progress > 0.25) {
    return {
      level: 'due-soon',
      message: `Behind pace — ${Math.round(elapsedFrac * 100)}% of the ${g.horizon === 'weekly' ? 'week' : 'month'} gone, ${Math.round(g.progress * 100)}% done. ${remaining} task${remaining === 1 ? '' : 's'} left.${nextBit}`,
      daysLeft: dl,
      needsBreakdown: false,
    }
  }

  return {
    level: 'on-track',
    message: `On track · ${remaining} of ${g.totalTasks} task${g.totalTasks === 1 ? '' : 's'} left.${nextBit}`,
    daysLeft: dl,
    needsBreakdown: false,
  }
}
