/**
 * src/lib/playbooks/shared.ts — building blocks shared by the E-3 playbooks
 * (backlog §3.4 / §3.6).
 *
 *  - computeBig3(userId)      : the same favorable-domain-biased Big-3 the
 *                               /api/today/big3 route computes, as a server fn
 *                               (no HTTP, no auth) so playbooks reuse it.
 *  - openRedirection(userId)  : the newest OPEN redirection_proposal, if any —
 *                               E-7 owns proposal *creation*; here we only read
 *                               one to attach its `rp:<id>:accept` action.
 *  - generateCoaching(...)    : Flow AI call under the §3.6 coaching policy
 *                               (exactly one primary action, receipts, honest
 *                               confidence, directional not judgmental). Falls
 *                               back to a deterministic template if Flow AI is
 *                               unavailable — a brief must always ship.
 *  - captureBriefEvent(...)   : server-side PostHog capture (plain-fetch,
 *                               never throws) for brief_delivered / shutdown.
 */
import { prisma } from '@/lib/db/prisma'
import { decrypt } from '@/lib/encryption'
import { calculateBazi } from '@/lib/bazi'
import { calculateDayMasterStrength } from '@/lib/bazi-strength'
import type { Stem, Branch } from '@/lib/bazi'
import {
  computePhases, domainFavorability, ELEMENT_EN,
  type Element, type Verdict,
} from '@/lib/bazi-phases'
import { DEFAULT_TIMEZONE, isValidTimezone, userDayBounds, userLocalDate } from '@/lib/user-time'
import { createChatCompletion, type ChatMessage } from '@/lib/flow-ai'
import type { AgentContext } from '@/lib/agent-context'
import { getBehaviorTokens, type BriefTone } from '@/lib/behavior-tokens'

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }
const W_FAVORABLE = 100
const W_NEUTRAL = 40
const W_UNFAVORABLE = 0

export interface Big3Item {
  id: string
  name: string
  domainId: string | null
  goalName: string | null
  favorVerdict: Verdict | null
}

export interface Big3Result {
  timezone: string
  favorableElements: string[]
  favorableDomains: string[]
  dayTintLine: string | null
  dayPillar: string | null
  big3: Big3Item[]
}

/**
 * Server-side Big-3 — the favorable-domain-biased top three open tasks for the
 * user's local today. Mirrors /api/today/big3 exactly (same weights, same phase
 * decode). Returns an empty big3 (with the day tint if available) when there is
 * no birth profile or no candidate tasks.
 */
export async function computeBig3(userId: string): Promise<Big3Result> {
  const now = new Date()
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      birthDateEncrypted: true, birthTimeEncrypted: true,
      gender: true, dayElement: true, timezone: true,
    },
  })
  const timezone = isValidTimezone(profile?.timezone) ? (profile!.timezone as string) : DEFAULT_TIMEZONE

  let favorMap: Record<string, { verdict: Verdict; element: string }> = {}
  let favorableDomains: string[] = []
  let favorableElements: string[] = []
  let dayTintLine: string | null = null
  let dayPillar: string | null = null

  if (profile) {
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
        gender: profile.gender, birth, now, timezone,
      })
      favorableElements = phases.favorable.favorable.map((e) => ELEMENT_EN[e as Element] ?? e)
      const fm = domainFavorability(dayElement, strength)
      favorMap = Object.fromEntries(
        Object.entries(fm).map(([k, v]) => [k, { verdict: v.verdict, element: ELEMENT_EN[v.element] }]),
      )
      favorableDomains = Object.values(fm).filter((v) => v.verdict === 'favorable').map((v) => v.domain)
      const dayLayer = phases.layers.find((l) => l.key === 'day')
      if (dayLayer) { dayTintLine = dayLayer.guidance; dayPillar = dayLayer.pillar }
    } catch (e) {
      console.error('[playbooks/shared] big3 phase decode failed:', e)
    }
  }

  const { start: todayStart, end: todayEnd } = userDayBounds(timezone, now)
  const tasks = await prisma.oSTask.findMany({
    where: {
      userId,
      status: { in: ['todo', 'in_progress'] },
      OR: [{ scheduledAt: { gte: todayStart, lte: todayEnd } }, { scheduledAt: null }],
    },
    select: { id: true, name: true, domainId: true, priority: true, scheduledAt: true, goalId: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    take: 50,
  })

  const goalIds = Array.from(new Set(tasks.map((t) => t.goalId).filter(Boolean))) as string[]
  const goals = goalIds.length
    ? await prisma.goal.findMany({ where: { id: { in: goalIds }, userId }, select: { id: true, name: true, domainId: true } })
    : []
  const goalById = new Map(goals.map((g) => [g.id, g]))

  const scored = tasks.map((t) => {
    const g = t.goalId ? goalById.get(t.goalId) : undefined
    const domain = (t.domainId || g?.domainId || null) as string | null
    const fav = domain ? favorMap[domain] : undefined
    const verdict: Verdict | null = fav ? fav.verdict : null
    const domainW = verdict === 'favorable' ? W_FAVORABLE : verdict === 'unfavorable' ? W_UNFAVORABLE : W_NEUTRAL
    const priorityW = (3 - (PRIORITY_RANK[t.priority] ?? 1)) * 3
    const scheduledW = t.scheduledAt ? 4 : 0
    return {
      item: { id: t.id, name: t.name, domainId: domain, goalName: g?.name ?? null, favorVerdict: verdict } as Big3Item,
      priority: t.priority,
      score: domainW + priorityW + scheduledW,
    }
  })
  scored.sort((a, b) =>
    b.score - a.score ||
    (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
    a.item.name.localeCompare(b.item.name),
  )

  return {
    timezone, favorableElements, favorableDomains, dayTintLine, dayPillar,
    big3: scored.slice(0, 3).map((s) => s.item),
  }
}

export interface OpenRedirection {
  id: string
  goalId: string
  rationale: string
  proposedSlotStart: Date
  proposedSlotEnd: Date
}

/**
 * The newest OPEN, non-expired redirection proposal for the user, if any.
 * E-7 owns creation — this only reads one so a brief can attach the operable
 * `rp:<id>:accept` action when the E-7 pipeline has produced a proposal.
 */
export async function openRedirection(userId: string): Promise<OpenRedirection | null> {
  const now = new Date()
  const p = await prisma.redirectionProposal.findFirst({
    where: {
      userId, status: 'open',
      // 48h expiry per E-7; treat rows older than 48h as expired even if a
      // sweeper hasn't run yet.
      createdAt: { gte: new Date(now.getTime() - 48 * 3600 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, goalId: true, rationale: true, proposedSlotStart: true, proposedSlotEnd: true },
  }).catch(() => null)
  return p
}

export interface DueCommitment {
  id: string
  content: string
  dueDate: string | null // "YYYY-MM-DD"
  overdue: boolean
  timesSurfaced: number
}

/**
 * Commitments to surface in today's brief (E-6, §3.3 follow-up contract):
 * every OPEN commitment whose due_date is <= the user's local today. Each is
 * offered three operable choices in the brief — done / renegotiate / drop.
 *
 * The §3.3 rule: an OVERDUE-unanswered commitment appears at most TWICE, then
 * moves to the weekly review. We count prior surfacings via inbox_messages that
 * carried the `cm:<id>:` actions, and drop any that have already been shown
 * twice while still overdue. (Weekly hook: Phase E's weekly review will sweep
 * the >2×-surfaced overdue set — NOT built here.)
 *
 * Never guilt language: the caller renders these as neutral facts + choices.
 */
export async function dueCommitments(userId: string, at: Date = new Date()): Promise<DueCommitment[]> {
  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { timezone: true } }).catch(() => null)
  const tz = isValidTimezone(profile?.timezone) ? (profile!.timezone as string) : DEFAULT_TIMEZONE
  const todayIso = userLocalDate(tz, at).iso

  // OPEN commitments due today or earlier (raw SQL: relation-free table).
  const rows = await prisma.$queryRawUnsafe<{ id: string; content: string; due_date: Date | null }[]>(
    `SELECT id, content, due_date FROM commitments
       WHERE user_id = $1 AND status = 'open' AND due_date IS NOT NULL AND due_date <= $2::date
       ORDER BY due_date ASC, created_at ASC LIMIT 20`,
    userId, todayIso,
  ).catch(() => [] as Array<{ id: string; content: string; due_date: Date | null }>)
  if (rows.length === 0) return []

  // Count prior surfacings: inbox_messages whose actions_json contains a
  // cm:<id>:done action for this commitment.
  const out: DueCommitment[] = []
  for (const r of rows) {
    const dueIso = r.due_date ? (r.due_date instanceof Date ? r.due_date : new Date(r.due_date)).toISOString().slice(0, 10) : null
    const overdue = dueIso ? dueIso < todayIso : false
    const seen = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*)::bigint AS n FROM inbox_messages
         WHERE user_id = $1 AND actions_json::text LIKE $2`,
      userId, `%cm:${r.id}:done%`,
    ).catch(() => [] as Array<{ n: bigint }>)
    const timesSurfaced = Number(seen[0]?.n ?? 0)
    // §3.3: overdue-unanswered shows at most twice, then moves to weekly.
    if (overdue && timesSurfaced >= 2) continue
    out.push({ id: r.id, content: r.content, dueDate: dueIso, overdue, timesSurfaced })
  }
  return out
}

/**
 * Generate a coaching message from assembled context under the §3.6 policy.
 * Returns the body text ONLY (the action label is decided by the playbook).
 * Falls back to `fallbackBody` when Flow AI is unavailable — a brief always ships.
 */
export async function generateCoaching(args: {
  context: AgentContext
  instruction: string
  fallbackBody: string
  model?: string
  /**
   * E-11: the user whose behavior tokens set the coaching TONE. When given, the
   * stored brief_tone modulates the voice — `directive` (terse, imperative) vs
   * `reflective` (question-led, open). Pass `briefTone` to override the lookup
   * (probes / tests). Absent → tone-neutral (unchanged production default).
   */
  userId?: string
  briefTone?: BriefTone
}): Promise<{ body: string; usedLlm: boolean; tokenCost?: unknown; briefTone?: BriefTone }> {
  // Resolve tone: explicit override → stored token → none.
  let briefTone: BriefTone | undefined = args.briefTone
  if (!briefTone && args.userId) {
    try {
      briefTone = (await getBehaviorTokens(args.userId)).brief_tone
    } catch {
      briefTone = undefined
    }
  }

  const toneLine =
    briefTone === 'directive'
      ? '6. TONE (this user): directive & terse. Lead with the imperative action. No hedging, no questions back. Short declarative sentences.'
      : briefTone === 'reflective'
        ? '6. TONE (this user): reflective & question-led. Open with a brief observation, then pose ONE grounding question before the single action. Warm, exploratory.'
        : null

  const system = [
    'You are 8os, the user\'s agent-native operating system and accountability partner.',
    'COACHING POLICY (hard rules):',
    '1. ONE primary action per message — never a list of shoulds.',
    '2. Receipts required: every claim about the user\'s behavior must cite a real number from the context (minutes, share %, counts). Never invent numbers.',
    '3. Directional, never judgmental. Banned: guilt, streak-shaming, "you failed".',
    '4. Honest confidence: daily pillar guidance is soft ("orientation, not prediction"); 流月/流年 firmer. Never overclaim.',
    '5. Be terse and warm. 4–7 short sentences max. No markdown headers, no bullet lists longer than the given structure.',
    ...(toneLine ? [toneLine] : []),
    'Use ONLY facts present in the context block. If a fact is absent, do not fabricate it.',
  ].join('\n')

  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: `${args.instruction}\n\n=== CONTEXT (facts of record) ===\n${args.context.text}` },
  ]

  try {
    const resp = await createChatCompletion(messages, {
      model: args.model || 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 500,
      tool_choice: 'none',
    })
    const body = resp.choices?.[0]?.message?.content?.trim()
    if (body && body.length > 0) {
      return { body, usedLlm: true, tokenCost: resp.usage, briefTone }
    }
    return { body: args.fallbackBody, usedLlm: false, briefTone }
  } catch (e) {
    console.error('[playbooks/shared] Flow AI generation failed — using fallback:', e)
    return { body: args.fallbackBody, usedLlm: false, briefTone }
  }
}

/**
 * Server-side PostHog capture (plain fetch, never throws), following the
 * error-track.ts plain-capture pattern with the same NEXT_PUBLIC_POSTHOG_* env.
 */
export async function captureBriefEvent(
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
        api_key: apiKey,
        event,
        distinct_id: userId,
        timestamp: new Date().toISOString(),
        properties: { ...properties, $lib: '8os-heartbeat' },
      }),
      signal: ctrl.signal,
    }).catch(() => {})
    clearTimeout(t)
  } catch {
    /* never throws */
  }
}
