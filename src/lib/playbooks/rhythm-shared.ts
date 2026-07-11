/**
 * src/lib/playbooks/rhythm-shared.ts — building blocks shared by the Phase-E
 * RHYTHM playbooks (weekly / monthly / quarterly / annual), backlog §3.4 / §6.
 *
 * This is a NEW file (the concurrent E-11/E-12 build owns shared.ts and
 * generateCoaching — we CALL those, never edit them). Everything here is
 * derived from the user's REAL chart (bazi-phases) and REAL ledger
 * (attention_ledger / computeAlignment) — nothing is hardcoded.
 *
 *  - decodeUserPhases(userId)  : the natal decode + full phase engine result
 *                               (favorable elements, 流年/流月/日 layers, quarter),
 *                               mirroring computeBig3's decode path exactly.
 *  - onLiuYueBoundary(...)      : is `at` (user-local) the first local day of a
 *                               new 流月 solar-month? (the monthly trigger)
 *  - onLiChunBoundary(...)      : is `at` (user-local) the Lì Chūn day (± user
 *                               choice)? (the annual trigger)
 *  - onQuarterBoundary(...)     : 12-week cycle boundary (weeks anchored to an
 *                               epoch Monday) — the quarterly trigger.
 *  - isoWeekKey(...)            : ISO year-week string for the weekly idem key.
 *  - deliverRhythm(...)         : governed delivery + agent_runs finalize +
 *                               PostHog, the ONE path every rhythm playbook uses.
 *  - getBehaviorTokensSafe(...) : defensive call into E-11's behavior tokens
 *                               (returns null when the module/user is absent).
 *  - callGenerateCoaching(...)  : defensive wrapper over shared.generateCoaching.
 */
import { prisma } from '@/lib/db/prisma'
import { decrypt } from '@/lib/encryption'
import { calculateBazi } from '@/lib/bazi'
import { calculateDayMasterStrength, type DayMasterStrength } from '@/lib/bazi-strength'
import type { Stem, Branch } from '@/lib/bazi'
import {
  computePhases, computeQuarter, activeSolarMonth, baziYearOf, annualPillar,
  domainFavorability, ELEMENT_EN,
  type Element, type Verdict, type PhasesResult, type QuarterResult,
} from '@/lib/bazi-phases'
import {
  DEFAULT_TIMEZONE, isValidTimezone, userLocalDate, userLocalDayUTC,
} from '@/lib/user-time'
import { deliverProactive, type ProactiveKind } from '@/lib/channels/governor'
import type { ChannelMessage } from '@/lib/channels/types'
import type { AgentContext } from '@/lib/agent-context'

// ─── Chart decode (mirrors shared.computeBig3's decode exactly) ─────────────

export interface DecodedPhases {
  timezone: string
  dayElement: Element
  strength: DayMasterStrength
  phases: PhasesResult
  quarter: QuarterResult
  /** English-labelled favorable elements. */
  favorableElements: string[]
  /** Domain → favorability verdict for THIS chart. */
  domainFavor: Record<string, { verdict: Verdict; element: string; domain: string }>
  /** The natal moment (UTC), for boundary math. */
  birth: Date
  gender: string
}

/**
 * Decode a user's chart and run the phase engine + quarter projection.
 * Returns null when there is no birth profile or the decode fails — every
 * rhythm playbook degrades to a ledger-only message in that case.
 */
export async function decodeUserPhases(
  userId: string,
  at: Date = new Date(),
): Promise<DecodedPhases | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      birthDateEncrypted: true, birthTimeEncrypted: true,
      gender: true, dayElement: true, timezone: true,
    },
  }).catch(() => null)
  if (!profile) return null

  const timezone = isValidTimezone(profile.timezone) ? (profile.timezone as string) : DEFAULT_TIMEZONE
  try {
    const birthDate = decrypt(profile.birthDateEncrypted)
    const birthTime = profile.birthTimeEncrypted ? decrypt(profile.birthTimeEncrypted) : null
    const [y, m, d] = birthDate.split('-').map(Number)
    const [hh, mm] = birthTime ? birthTime.split(':').map(Number) : [12, 0]
    const natal = calculateBazi(y, m, d, hh, mm)
    const strength = calculateDayMasterStrength(natal).strength
    const dayElement = (profile.dayElement || natal.dayElement) as Element
    const birth = new Date(Date.UTC(y, m - 1, d, hh, mm))
    const phases = computePhases({
      dayElement, strength,
      monthStem: natal.monthPillar.stem as Stem,
      monthBranch: natal.monthPillar.branch as Branch,
      yearStem: natal.yearPillar.stem as Stem,
      dayBranch: natal.dayPillar.branch as Branch,
      gender: profile.gender, birth, now: at, timezone,
    })
    const quarter = computeQuarter({ dayElement, strength, now: at, months: 3 })
    const favorableElements = phases.favorable.favorable.map((e) => ELEMENT_EN[e as Element] ?? e)
    const fm = domainFavorability(dayElement, strength)
    const domainFavor = Object.fromEntries(
      Object.entries(fm).map(([k, v]) => [k, { verdict: v.verdict, element: ELEMENT_EN[v.element], domain: v.domain }]),
    )
    return { timezone, dayElement, strength, phases, quarter, favorableElements, domainFavor, birth, gender: profile.gender }
  } catch (e) {
    console.error('[rhythm-shared] decodeUserPhases failed:', e)
    return null
  }
}

/** The layer object for a given key, or null. */
export function layer(phases: PhasesResult, key: 'decade' | 'year' | 'month' | 'day' | 'week') {
  return phases.layers.find((l) => l.key === key) ?? null
}

// ─── Boundary detectors (all evaluated in the user's LOCAL civil date) ──────

/**
 * The Lì Chūn (立春) date, as a UTC-midnight Date, for the Gregorian year of
 * `at`. Uses the SAME activeSolarMonth machinery the engine uses — we ask the
 * engine for the 寅-month boundary that governs the year. We derive it by
 * scanning the current + next solar month for the 立春 term.
 */
export function liChunDateUTC(gregorianYear: number): Date {
  // activeSolarMonth returns the term in force at a date; 立春 falls ~Feb 4.
  // Probe a range of early-Feb dates to find the 立春 boundary for the year.
  for (let day = 2; day <= 6; day++) {
    const probe = new Date(Date.UTC(gregorianYear, 1, day)) // Feb = month index 1
    const m = activeSolarMonth(probe)
    if (m.term.name === '立春' && m.startDate.getUTCFullYear() === gregorianYear) {
      return m.startDate
    }
  }
  // Fallback: the boundary a day after Feb 3 (safe within the low-precision band).
  const probe = new Date(Date.UTC(gregorianYear, 1, 4))
  return activeSolarMonth(probe).startDate
}

/**
 * Is the user's LOCAL civil date at `at` the first day of a NEW 流月 solar
 * month? True when the active solar-month boundary equals the user's local
 * today (i.e. the month just turned over). This is the monthly trigger.
 */
export function onLiuYueBoundary(timezone: string, at: Date): { on: boolean; termName: string; termEn: string; startDate: string } {
  const localUTC = userLocalDayUTC(timezone, at) // user-local civil date at UTC midnight
  const m = activeSolarMonth(localUTC)
  const boundaryISO = m.startDate.toISOString().slice(0, 10)
  const localISO = localUTC.toISOString().slice(0, 10)
  return { on: boundaryISO === localISO, termName: m.term.name, termEn: m.term.nameEn, startDate: boundaryISO }
}

/**
 * Is the user's LOCAL civil date at `at` the Lì Chūn day (± user-chosen offset
 * in days)? This is the annual trigger. `offsetDays` lets a user pick a nearby
 * day (LNY campaign window) instead of the exact solar boundary.
 */
export function onLiChunBoundary(timezone: string, at: Date, offsetDays = 0): { on: boolean; liChunISO: string; baziYear: number } {
  const localUTC = userLocalDayUTC(timezone, at)
  const gy = localUTC.getUTCFullYear()
  // The Lì Chūn boundary can belong to this Gregorian year or, in very early
  // January, the prior year's — but Lì Chūn is always early Feb, so gy is right.
  const liChun = liChunDateUTC(gy)
  const target = new Date(liChun.getTime() + offsetDays * 86400000)
  const targetISO = target.toISOString().slice(0, 10)
  const localISO = localUTC.toISOString().slice(0, 10)
  return { on: targetISO === localISO, liChunISO: liChun.toISOString().slice(0, 10), baziYear: baziYearOf(localUTC) }
}

/**
 * 12-week cycle boundary. Weeks are anchored to a fixed epoch Monday
 * (2024-01-01 was a Monday) so every user's cycle grid is deterministic; a
 * boundary lands on the Monday that begins a new 12-week block, evaluated in
 * the user's local date. This is the quarterly trigger.
 */
const CYCLE_EPOCH_UTC = Date.UTC(2024, 0, 1) // Monday 2024-01-01
const WEEK_MS = 7 * 86400000
export function onQuarterBoundary(timezone: string, at: Date): { on: boolean; cycleIndex: number; weekInCycle: number } {
  const localUTC = userLocalDayUTC(timezone, at)
  // Monday-anchored week index from the epoch.
  const dow = (localUTC.getUTCDay() + 6) % 7 // 0 = Monday
  const isMonday = dow === 0
  const weeksSinceEpoch = Math.floor((localUTC.getTime() - CYCLE_EPOCH_UTC) / WEEK_MS)
  const cycleIndex = Math.floor(weeksSinceEpoch / 12)
  const weekInCycle = ((weeksSinceEpoch % 12) + 12) % 12
  return { on: isMonday && weekInCycle === 0, cycleIndex, weekInCycle }
}

/** ISO year-week key, e.g. "2026-W27", for the weekly idempotency key. */
export function isoWeekKey(timezone: string, at: Date): string {
  const localUTC = userLocalDayUTC(timezone, at)
  // ISO-8601 week: Thursday-anchored.
  const d = new Date(localUTC.getTime())
  const day = (d.getUTCDay() + 6) % 7 // 0 = Monday
  d.setUTCDate(d.getUTCDate() - day + 3) // move to Thursday of this ISO week
  const isoYear = d.getUTCFullYear()
  const firstThu = new Date(Date.UTC(isoYear, 0, 4))
  const firstDay = (firstThu.getUTCDay() + 6) % 7
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDay + 3)
  const week = 1 + Math.round((d.getTime() - firstThu.getTime()) / WEEK_MS)
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

// ─── Defensive E-11 behavior tokens (concurrent build; may be absent) ───────

export interface BehaviorTokensLite {
  tone?: string
  [k: string]: unknown
}

/**
 * Call E-11's getBehaviorTokens if the module exists; otherwise return null.
 * The rhythm playbooks bias tone (§3.6 rule 5) with these when present, and
 * degrade gracefully when the concurrent build hasn't landed yet.
 */
export async function getBehaviorTokensSafe(userId: string): Promise<BehaviorTokensLite | null> {
  try {
    const mod = await import('@/lib/behavior-tokens').catch(() => null)
    if (!mod) return null
    const fn = (mod as Record<string, unknown>).getBehaviorTokens
    if (typeof fn !== 'function') return null
    const tokens = await (fn as (u: string) => Promise<BehaviorTokensLite>)(userId)
    return tokens ?? null
  } catch {
    return null
  }
}

// ─── Defensive coaching call (shared.ts is owned by the concurrent build) ───

/**
 * Wrapper over shared.generateCoaching — imported lazily so a signature/module
 * hiccup in the concurrently-edited shared.ts never crashes a rhythm run; on
 * any failure we return the deterministic fallback body.
 */
export async function callGenerateCoaching(args: {
  context: AgentContext
  instruction: string
  fallbackBody: string
}): Promise<{ body: string; usedLlm: boolean; tokenCost?: unknown }> {
  try {
    const mod = await import('./shared')
    const fn = mod.generateCoaching
    if (typeof fn !== 'function') return { body: args.fallbackBody, usedLlm: false }
    return await fn(args)
  } catch (e) {
    console.error('[rhythm-shared] generateCoaching wrapper failed — fallback:', e)
    return { body: args.fallbackBody, usedLlm: false }
  }
}

// ─── PostHog capture (plain fetch, never throws — mirrors shared.ts) ─────────

export async function captureRhythmEvent(
  userId: string,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!apiKey) return
    const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/+$/, '')
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey, event, distinct_id: userId,
        timestamp: new Date().toISOString(),
        properties: { ...properties, $lib: '8os-rhythm' },
      }),
      signal: ctrl.signal,
    }).catch(() => {})
    clearTimeout(t)
  } catch {
    /* never throws */
  }
}

// ─── Governed delivery (the ONE path every rhythm playbook uses) ────────────

export interface RhythmRunResult {
  status: 'done' | 'skipped' | 'failed'
  reason?: string
  inboxMessageId?: string | null
  usedLlm?: boolean
  body?: string
  /** Structured output for the agent_runs.output_json audit trail + QA. */
  output?: Record<string, unknown>
  tokenCost?: unknown
}

/**
 * Deliver a rhythm message through the governor (E-13) and return the terminal
 * result. The heartbeat tick finalizes the agent_runs row from this result, so
 * we mirror the daily-brief contract: suppressed → skipped, else done.
 */
export async function deliverRhythm(
  userId: string,
  kind: ProactiveKind,
  message: ChannelMessage,
  gen: { body: string; usedLlm: boolean; tokenCost?: unknown },
  opts: { runId?: string; at?: Date; extraOutput?: Record<string, unknown> } = {},
): Promise<RhythmRunResult> {
  const gov = await deliverProactive(userId, message, { kind, runId: opts.runId, at: opts.at })
  if (gov.suppressed) {
    return { status: 'skipped', reason: gov.reason, usedLlm: gen.usedLlm, body: gen.body, output: { suppressed: gov.reason } }
  }
  await captureRhythmEvent(userId, 'rhythm_delivered', {
    kind, inbox_message_id: gov.outcome?.inboxMessageId ?? null, used_llm: gen.usedLlm,
  })
  return {
    status: 'done',
    inboxMessageId: gov.outcome?.inboxMessageId ?? null,
    usedLlm: gen.usedLlm,
    body: gen.body,
    tokenCost: gen.tokenCost,
    output: { inboxMessageId: gov.outcome?.inboxMessageId ?? null, usedLlm: gen.usedLlm, ...(opts.extraOutput ?? {}) },
  }
}

/** Local date helper (re-export shape used by playbooks). */
export function localISO(timezone: string, at: Date): string {
  return userLocalDate(isValidTimezone(timezone) ? timezone : DEFAULT_TIMEZONE, at).iso
}
