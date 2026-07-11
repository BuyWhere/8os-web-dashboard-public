/**
 * src/lib/mood/mood.ts — E-9 mood loop core (backlog §5).
 *
 * The mood loop closes the mission's "value AND happiness" promise: the daily
 * shutdown captures a 1-tap mood + energy (1-5), and the weekly review surfaces
 * an OBSERVATIONAL correlation between how the user spent their attention and
 * how they felt — only when the signal clears a threshold.
 *
 * Guardrails (non-negotiable, doc §5 E-9):
 *   - Language is OBSERVATIONAL only — never causal, never prescriptive about
 *     mental health. We describe co-occurrence ("in weeks where … your energy
 *     averaged …"), never "because", "causes", "improves", "you should".
 *   - The insight is SUPPRESSED entirely below threshold (n ≥ 10 logs AND
 *     |r| ≥ 0.3 on weekly aggregates).
 *   - `shouldSoftenTone` lets the coaching layer soften goal-push language when
 *     mood trends persistently low. The agent NEVER comments on the low mood —
 *     it only softens. This helper is exported for E-5/E-11 to read; this file
 *     does NOT edit the brief/coaching files.
 *
 * Data sources (READ-ONLY of the ledger via the existing shape):
 *   - mood_logs           → weekly mean mood/energy (this file owns mood_logs)
 *   - attention_ledger    → per-(goal,day) minutes/actions/mentions; joined to
 *     goals.domain to get per-DOMAIN weekly attention share. We read the ledger
 *     table directly (same shape computeLedger writes) — we never touch
 *     alignment-engine.ts (E-8 owns it).
 *
 * All local-date math uses the E-0 user-time util.
 */
import { prisma } from '@/lib/db/prisma'
import { getUserTimezone, userLocalDate } from '@/lib/user-time'

// The six life domains (matches Goal.domainId + dashboard DOMAIN_ICONS).
export const MOOD_DOMAINS = ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'] as const
export type MoodDomain = (typeof MOOD_DOMAINS)[number]

const DOMAIN_LABEL: Record<string, string> = {
  career: 'Career', wealth: 'Wealth', health: 'Health',
  relationships: 'Relationships', learning: 'Learning', legacy: 'Legacy',
}

// Thresholds (doc §5 E-9): suppress below either.
export const MIN_LOGS = 10
export const MIN_ABS_R = 0.3

export interface MoodLogRow {
  localDate: string // YYYY-MM-DD
  mood: number | null
  energy: number | null
}

export interface MoodInsight {
  domain: MoodDomain
  metric: 'mood' | 'energy'
  r: number // Pearson r on weekly aggregates
  weeks: number // number of weeks in the correlation
  text: string // observational sentence
}

export interface MoodInsightResult {
  available: boolean // true only when at least one insight cleared threshold
  logCount: number
  reason?: string // why suppressed (below threshold), for QA/debug
  insights: MoodInsight[]
}

/** ISO Monday-anchored week key (YYYY-Www style) for a civil date string. */
function isoWeekKey(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  // ISO week: Thursday-anchored.
  const day = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Pearson correlation of two equal-length numeric series; null if degenerate. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length
  if (n < 2 || ys.length !== n) return null
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx
    const b = ys[i] - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  if (dx === 0 || dy === 0) return null // no variance → correlation undefined
  const r = num / Math.sqrt(dx * dy)
  if (!Number.isFinite(r)) return null
  return r
}

/** Blended per-domain attention share for a single day's ledger rows, using the
 * same minutes-50 / actions-30 / mentions-20 blend as the alignment ledger. */
function domainSharesForDay(
  rows: { domain: string; minutes: number; actions: number; mentions: number }[],
): Record<string, number> {
  const total = { minutes: 0, actions: 0, mentions: 0 }
  for (const r of rows) {
    total.minutes += r.minutes
    total.actions += r.actions
    total.mentions += r.mentions
  }
  const comps: { k: 'minutes' | 'actions' | 'mentions'; w: number }[] = [
    { k: 'minutes', w: 0.5 }, { k: 'actions', w: 0.3 }, { k: 'mentions', w: 0.2 },
  ]
  const active = comps.filter((c) => total[c.k] > 0)
  const wSum = active.reduce((s, c) => s + c.w, 0)
  const out: Record<string, number> = {}
  for (const r of rows) {
    let share = 0
    if (wSum > 0) for (const c of active) share += (c.w / wSum) * (r[c.k] / total[c.k])
    out[r.domain] = (out[r.domain] ?? 0) + share
  }
  return out
}

/** Observational sentence for a cleared correlation. Threshold examples of the
 * share are picked so the sentence reads as an honest co-occurrence, never as
 * cause or advice. */
function insightSentence(
  domain: MoodDomain, metric: 'mood' | 'energy', r: number,
  weeks: { share: number; value: number }[],
): string {
  const label = DOMAIN_LABEL[domain] ?? domain
  const noun = metric === 'mood' ? 'mood' : 'energy'
  // Split weeks at the median attention share; compare the mean metric of the
  // high-share weeks vs the low-share weeks — the concrete, data-true delta.
  const sorted = [...weeks].sort((a, b) => a.share - b.share)
  const mid = Math.floor(sorted.length / 2)
  const low = sorted.slice(0, mid)
  const high = sorted.slice(sorted.length - mid)
  const mean = (arr: { value: number }[]) => arr.reduce((s, w) => s + w.value, 0) / Math.max(arr.length, 1)
  const highShareMean = high.reduce((s, w) => s + w.share, 0) / Math.max(high.length, 1)
  const delta = mean(high) - mean(low)
  const sign = delta >= 0 ? '+' : '−'
  const mag = Math.abs(delta).toFixed(1)
  const pct = Math.round(highShareMean * 100)
  // Observational template only — describes the weeks, states the average, no cause/advice.
  return `In weeks where ${label} got more of your time (around ${pct}%+), your ${noun} averaged ${sign}${mag} versus your lower-${label} weeks.`
}

/**
 * Compute the weekly mood/energy vs per-domain attention-share correlation
 * insights for a user. Returns { available:false } (suppressed) unless there
 * are ≥ MIN_LOGS mood logs AND at least one (domain × metric) pair clears
 * |r| ≥ MIN_ABS_R on the weekly aggregates.
 *
 * Reads mood_logs + attention_ledger + goals only. Pure read — never writes.
 */
export async function computeMoodInsights(userId: string): Promise<MoodInsightResult> {
  const tz = await getUserTimezone(userId)

  // All mood logs for the user (the log-count threshold is over ALL logs).
  const logs = await prisma.moodLog.findMany({
    where: { userId },
    select: { localDate: true, mood: true, energy: true },
    orderBy: { localDate: 'asc' },
  })
  const logCount = logs.length
  if (logCount < MIN_LOGS) {
    return { available: false, logCount, reason: `below log threshold (${logCount}/${MIN_LOGS})`, insights: [] }
  }

  // Weekly mean mood/energy from the logs.
  const localIso = (d: Date) => userLocalDate(tz, d).iso // localDate is a @db.Date → midnight UTC
  const byWeekMood = new Map<string, { mood: number[]; energy: number[] }>()
  for (const l of logs) {
    const wk = isoWeekKey(localIso(l.localDate))
    let e = byWeekMood.get(wk)
    if (!e) { e = { mood: [], energy: [] }; byWeekMood.set(wk, e) }
    if (l.mood != null) e.mood.push(l.mood)
    if (l.energy != null) e.energy.push(l.energy)
  }

  // Per-domain weekly attention share from the ledger, joined to goals.domain.
  const ledger = await prisma.attentionLedger.findMany({
    where: { userId, goalId: { not: null } },
    select: { goalId: true, day: true, minutes: true, actions: true, mentions: true },
    take: 5000,
  })
  const goalIds = Array.from(new Set(ledger.map((r) => r.goalId).filter((g): g is string => !!g)))
  const goals = goalIds.length
    ? await prisma.goal.findMany({ where: { id: { in: goalIds } }, select: { id: true, domainId: true } })
    : []
  const domainOf = new Map(goals.map((g) => [g.id, g.domainId]))

  // Aggregate ledger rows to (week, day) domain totals, then daily shares, then
  // week means of the daily shares.
  const perDay = new Map<string, { domain: string; minutes: number; actions: number; mentions: number }[]>()
  for (const r of ledger) {
    const domain = r.goalId ? domainOf.get(r.goalId) : null
    if (!domain) continue
    const iso = localIso(r.day)
    let arr = perDay.get(iso)
    if (!arr) { arr = []; perDay.set(iso, arr) }
    arr.push({ domain, minutes: r.minutes, actions: r.actions, mentions: r.mentions })
  }
  // week → domain → list of daily shares
  const weekDomainShares = new Map<string, Map<string, number[]>>()
  for (const [iso, rows] of Array.from(perDay.entries())) {
    const wk = isoWeekKey(iso)
    const shares = domainSharesForDay(rows)
    let dm = weekDomainShares.get(wk)
    if (!dm) { dm = new Map(); weekDomainShares.set(wk, dm) }
    for (const dom of MOOD_DOMAINS) {
      const s = shares[dom] ?? 0
      let list = dm.get(dom)
      if (!list) { list = []; dm.set(dom, list) }
      list.push(s)
    }
  }

  // For each domain × metric, build paired weekly series over weeks that have
  // BOTH a mood log and ledger data, then correlate.
  const insights: MoodInsight[] = []
  for (const domain of MOOD_DOMAINS) {
    for (const metric of ['mood', 'energy'] as const) {
      const shareSeries: number[] = []
      const valueSeries: number[] = []
      const pairs: { share: number; value: number }[] = []
      for (const [wk, mm] of Array.from(byWeekMood.entries())) {
        const vals = metric === 'mood' ? mm.mood : mm.energy
        if (vals.length === 0) continue
        const dm = weekDomainShares.get(wk)
        const dailyShares = dm?.get(domain)
        if (!dailyShares || dailyShares.length === 0) continue
        const meanShare = dailyShares.reduce((s: number, v: number) => s + v, 0) / dailyShares.length
        const meanVal = vals.reduce((s, v) => s + v, 0) / vals.length
        shareSeries.push(meanShare)
        valueSeries.push(meanVal)
        pairs.push({ share: meanShare, value: meanVal })
      }
      if (shareSeries.length < 3) continue // need a few weeks to say anything
      const r = pearson(shareSeries, valueSeries)
      if (r == null || Math.abs(r) < MIN_ABS_R) continue
      insights.push({
        domain, metric, r,
        weeks: shareSeries.length,
        text: insightSentence(domain, metric, r, pairs),
      })
    }
  }

  // Keep the strongest few, strongest first — never overwhelm.
  insights.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
  const top = insights.slice(0, 3)

  if (top.length === 0) {
    return { available: false, logCount, reason: `no correlation cleared |r| >= ${MIN_ABS_R}`, insights: [] }
  }
  return { available: true, logCount, insights: top }
}

/**
 * shouldSoftenTone — true when the user's recent mood trends persistently low,
 * so the coaching layer (E-5 brief / E-11 behavior tokens) can soften goal-push
 * language. This is a behavior-token READ ONLY: the agent must NEVER comment on
 * the mood itself, only soften. Exported here for later use — this file does not
 * edit the brief/coaching files.
 *
 * Definition: over the last `days` (default 14) local days, if there are at
 * least 3 mood logs AND the mean mood ≤ 2.4 (persistently low on the 1-5 scale),
 * return true. Sparse or absent data → false (never assume distress).
 */
export async function shouldSoftenTone(
  userId: string,
  opts: { days?: number; at?: Date } = {},
): Promise<boolean> {
  try {
    const days = opts.days ?? 14
    const at = opts.at ?? new Date()
    const tz = await getUserTimezone(userId)
    const { iso } = userLocalDate(tz, at)
    const [y, m, d] = iso.split('-').map(Number)
    const since = new Date(Date.UTC(y, m - 1, d - (days - 1)))
    const logs = await prisma.moodLog.findMany({
      where: { userId, localDate: { gte: since }, mood: { not: null } },
      select: { mood: true },
    })
    if (logs.length < 3) return false
    const mean = logs.reduce((s, l) => s + (l.mood ?? 0), 0) / logs.length
    return mean <= 2.4
  } catch (e) {
    console.error('[mood] shouldSoftenTone failed (defaulting false):', e)
    return false
  }
}
