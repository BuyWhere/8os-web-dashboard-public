/**
 * src/lib/agent-context.ts — the context assembler of record (E-3, backlog §3.1).
 *
 * `assembleAgentContext(userId, runKind)` composes the four spec blocks
 * (Identity / Season / State / Memory) deterministically, token-budgeted, each
 * prefixed with an HONEST header. Same inputs → same context.
 *
 *   Identity  — archetype, Day Master + strength, favorable elements
 *               (ArchetypeResult + bazi-phases via the live natal decode).
 *   Season    — Luck Pillar / 流年 / 流月 / today's pillar with honest
 *               confidence labels (the PhaseLayer basis/confidence tags).
 *   State     — top goals with momentum (computeAlignment), today's calendar
 *               incl. external_events, latest alignment verdict.
 *   Memory    — a STUB (Phase D / E-5). Present as an honest header + note so
 *               the prompt contract is stable when the memory layer lands.
 *
 * "Today" is always the USER's local day via the E-0 user-time util.
 *
 * This is deliberately dependency-light and NEVER throws: every block degrades
 * to an honest "not available" line so a playbook can always run. It reuses the
 * SAME phase-engine decode path as /api/today/big3 and /api/shutdown — no new
 * metaphysics is invented here.
 */
import { prisma } from '@/lib/db/prisma'
import { decrypt } from '@/lib/encryption'
import { calculateBazi } from '@/lib/bazi'
import { calculateDayMasterStrength } from '@/lib/bazi-strength'
import type { Stem, Branch } from '@/lib/bazi'
import {
  computePhases, ELEMENT_EN, type Element, type PhaseLayer,
} from '@/lib/bazi-phases'
import { computeAlignment, type PerGoalAlignment } from '@/lib/alignment-engine'
import {
  DEFAULT_TIMEZONE, isValidTimezone, userDayBounds, userLocalDate,
} from '@/lib/user-time'

export type RunKind =
  | 'daily_brief' | 'daily_shutdown' | 'weekly' | 'monthly'
  | 'quarterly' | 'annual' | 'adhoc_nudge'

export interface IdentityFacts {
  archetypeName: string | null
  dayMaster: string | null
  dayElement: string | null
  strength: string | null
  favorableElements: string[]
}

export interface SeasonLayerFact {
  key: PhaseLayer['key']
  label: string
  pillar: string | null
  verdict: string
  confidence: string
  guidance: string
}

export interface CalendarItemFact {
  title: string
  startsAt: string
  source: 'native' | 'external'
}

export interface StateFacts {
  topGoals: Array<{
    name: string
    domain: string
    rank: number
    sharePct: number
    momentum: string
    minutes: number
  }>
  todayEvents: CalendarItemFact[]
  alignmentHeadline: string | null
  topRedirection: string | null
  trackedMinutes: number
}

export interface MemoryItemFact {
  id: string
  kind: string
  content: string
  salience: number
  pinned: boolean
  sourceKind: string | null
}

export interface CommitmentFact {
  id: string
  content: string
  dueDate: string | null
  status: string
}

export interface MemoryFacts {
  items: MemoryItemFact[]
  commitments: CommitmentFact[]
}

export interface AgentContext {
  userId: string
  runKind: RunKind
  timezone: string
  localDate: string
  identity: IdentityFacts
  season: SeasonLayerFact[]
  state: StateFacts
  memory: MemoryFacts
  /** The full deterministic prompt-ready context string (honest headers). */
  text: string
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

/**
 * Decode the natal chart + phase engine for a user, mirroring the big3/shutdown
 * decode path exactly. Returns null when there is no profile / decode fails —
 * the caller degrades gracefully.
 */
async function decodePhases(userId: string, timezone: string, now: Date) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      birthDateEncrypted: true, birthTimeEncrypted: true,
      gender: true, dayElement: true, dayMaster: true, timezone: true,
    },
  })
  if (!profile) return { profile: null, phases: null, strength: null as string | null }

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
      dayElement,
      strength,
      monthStem: natal.monthPillar.stem as Stem,
      monthBranch: natal.monthPillar.branch as Branch,
      yearStem: natal.yearPillar.stem as Stem,
      dayBranch: natal.dayPillar.branch as Branch,
      gender: profile.gender,
      birth,
      now,
      timezone,
    })
    return { profile, phases, strength }
  } catch (e) {
    console.error('[agent-context] phase decode failed:', e)
    return { profile, phases: null, strength: null }
  }
}

// ── Memory block (E-5/E-6, backlog §3.2) ──────────────────────────────────────
// Keyword tokens for goal-relevance scoring — same STOP-word/token approach as
// src/lib/memory/extract.ts (no embeddings; parked per §3.2). Kept local so this
// module stays dependency-light.
const MEM_STOP = new Set([
  'the', 'a', 'an', 'to', 'of', 'and', 'or', 'in', 'on', 'at', 'for', 'with',
  'is', 'are', 'was', 'be', 'i', 'my', 'me', 'you', 'your', 'it', 'that', 'this',
])
function memTokens(s: string): Set<string> {
  return new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 2 && !MEM_STOP.has(w)))
}
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let n = 0
  Array.from(a).forEach((t) => { if (b.has(t)) n++ })
  return n
}

interface MemRow {
  id: string; kind: string; content: string; salience: number; pinned: boolean
  source_kind: string | null; last_confirmed_at: Date; last_referenced_at: Date | null
}
interface CommitRow { id: string; content: string; due_date: Date | null; status: string }

/**
 * Retrieve the top-k memory_items + open commitments for context assembly.
 * Rank = salience × recency-decay × keyword/goal relevance (v1 SQL+keyword, no
 * embeddings). Pinned items always rank first. Excludes superseded rows and the
 * `excluded` tombstones. Deterministic given the same DB state. Never throws.
 */
async function assembleMemory(
  userId: string,
  goalKeywords: Set<string>,
  now: Date,
): Promise<MemoryFacts> {
  const rows = await prisma.$queryRawUnsafe<MemRow[]>(
    `SELECT id, kind, content, salience, pinned, source_kind, last_confirmed_at, last_referenced_at
       FROM memory_items
       WHERE user_id = $1 AND superseded_by IS NULL AND kind <> 'excluded'
       ORDER BY pinned DESC, salience DESC, last_confirmed_at DESC
       LIMIT 200`,
    userId,
  ).catch(() => [] as MemRow[])

  const HALF_LIFE_MS = 30 * 24 * 3600 * 1000 // 30-day recency half-life
  const scored = rows.map((r) => {
    const ref = r.last_referenced_at ?? r.last_confirmed_at
    const ageMs = Math.max(0, now.getTime() - new Date(ref).getTime())
    const recency = Math.pow(0.5, ageMs / HALF_LIFE_MS) // 1 → 0
    const rel = 1 + overlap(memTokens(r.content), goalKeywords) // 1..n
    const score = (r.pinned ? 1000 : 0) + Number(r.salience) * recency * rel
    return { r, score }
  })
  scored.sort((a, b) => b.score - a.score || a.r.id.localeCompare(b.r.id))
  const items: MemoryItemFact[] = scored.slice(0, 12).map(({ r }) => ({
    id: r.id, kind: r.kind, content: r.content, salience: Number(r.salience),
    pinned: r.pinned, sourceKind: r.source_kind,
  }))

  const commits = await prisma.$queryRawUnsafe<CommitRow[]>(
    `SELECT id, content, due_date, status FROM commitments
       WHERE user_id = $1 AND status = 'open'
       ORDER BY due_date NULLS LAST, created_at DESC LIMIT 20`,
    userId,
  ).catch(() => [] as CommitRow[])
  const commitments: CommitmentFact[] = commits.map((c) => ({
    id: c.id, content: c.content, status: c.status,
    dueDate: c.due_date ? (c.due_date instanceof Date ? c.due_date : new Date(c.due_date)).toISOString().slice(0, 10) : null,
  }))

  return { items, commitments }
}

/**
 * Assemble the deterministic, token-budgeted, honestly-labelled agent context.
 * Never throws — every block degrades to an honest "not available" line.
 */
export async function assembleAgentContext(
  userId: string,
  runKind: RunKind,
): Promise<AgentContext> {
  const now = new Date()
  const timezone = await getTz(userId)
  const localDate = userLocalDate(timezone, now).iso

  // ── Identity + Season (phase engine) ──────────────────────────────────────
  const { profile, phases, strength } = await decodePhases(userId, timezone, now)

  const archetype = await prisma.archetypeResult
    .findUnique({ where: { userId }, select: { archetypeName: true } })
    .catch(() => null)

  const favorableElements = phases
    ? phases.favorable.favorable.map((e) => ELEMENT_EN[e as Element] ?? e)
    : []

  const identity: IdentityFacts = {
    archetypeName: archetype?.archetypeName ?? null,
    dayMaster: profile?.dayMaster ?? null,
    dayElement: profile?.dayElement ?? null,
    strength: strength ?? null,
    favorableElements,
  }

  const season: SeasonLayerFact[] = phases
    ? phases.layers
        .filter((l) => l.key === 'decade' || l.key === 'year' || l.key === 'month' || l.key === 'day')
        .map((l) => ({
          key: l.key,
          label: l.label,
          pillar: l.pillar,
          verdict: l.verdict,
          confidence: l.confidence,
          guidance: l.guidance,
        }))
    : []

  // ── State (alignment + calendar) ──────────────────────────────────────────
  const { start: dayStart, end: dayEnd } = userDayBounds(timezone, now)

  let alignmentHeadline: string | null = null
  let topRedirection: string | null = null
  let topGoals: StateFacts['topGoals'] = []
  let trackedMinutes = 0
  try {
    const alignment = await computeAlignment(userId, { days: 7 })
    alignmentHeadline = alignment.weekly.headline || alignment.daily.headline || null
    topRedirection = alignment.weekly.topRedirection || null
    const perGoal = [...alignment.weekly.perGoal].sort(
      (a: PerGoalAlignment, b: PerGoalAlignment) => a.rank - b.rank,
    )
    trackedMinutes = perGoal.reduce((s, g) => s + g.minutes, 0)
    topGoals = perGoal.slice(0, 3).map((g) => ({
      name: g.name,
      domain: g.domain,
      rank: g.rank,
      sharePct: Math.round(g.share * 100),
      momentum: g.momentum,
      minutes: g.minutes,
    }))
  } catch (e) {
    console.error('[agent-context] alignment failed:', e)
  }

  const [nativeEvents, externalEvents] = await Promise.all([
    prisma.calendarEvent
      .findMany({
        where: { userId, startAt: { gte: dayStart, lte: dayEnd } },
        select: { title: true, startAt: true },
        orderBy: { startAt: 'asc' },
        take: 20,
      })
      .catch(() => [] as Array<{ title: string; startAt: Date }>),
    prisma.externalEvent
      .findMany({
        where: { userId, isDeleted: false, startsAt: { gte: dayStart, lte: dayEnd } },
        select: { title: true, startsAt: true },
        orderBy: { startsAt: 'asc' },
        take: 20,
      })
      .catch(() => [] as Array<{ title: string | null; startsAt: Date }>),
  ])

  const todayEvents: CalendarItemFact[] = [
    ...nativeEvents.map((e) => ({
      title: e.title, startsAt: e.startAt.toISOString(), source: 'native' as const,
    })),
    ...externalEvents.map((e) => ({
      title: e.title ?? '(untitled)', startsAt: e.startsAt.toISOString(), source: 'external' as const,
    })),
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const state: StateFacts = {
    topGoals,
    todayEvents,
    alignmentHeadline,
    topRedirection,
    trackedMinutes,
  }

  // ── Memory (E-5/E-6): top-k memory_items + open commitments, ranked by
  // salience × recency × goal-relevance. Goal keywords bias relevance toward
  // what the user is actually working on right now.
  const goalKeywords = new Set<string>()
  for (const g of topGoals) Array.from(memTokens(`${g.name} ${g.domain}`)).forEach((t) => goalKeywords.add(t))
  const memory = await assembleMemory(userId, goalKeywords, now)

  const text = renderContextText({ runKind, timezone, localDate, identity, season, state, memory })

  return { userId, runKind, timezone, localDate, identity, season, state, memory, text }
}

async function getTz(userId: string): Promise<string> {
  try {
    const { getUserTimezone } = await import('@/lib/user-time')
    return await getUserTimezone(userId)
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/**
 * Deterministic prompt-ready rendering with honest block headers. Token budget
 * is enforced structurally (fixed block sizes: identity ≤ ~6 lines, season 4
 * layers, state ≤ 3 goals + ≤ 6 events).
 */
function renderContextText(c: {
  runKind: RunKind
  timezone: string
  localDate: string
  identity: IdentityFacts
  season: SeasonLayerFact[]
  state: StateFacts
  memory: MemoryFacts
}): string {
  const L: string[] = []

  L.push(`[run — ${c.runKind}, ${c.localDate} local (${c.timezone})]`)

  // Identity
  L.push('')
  L.push('[what 8os knows — identity]')
  if (c.identity.archetypeName) L.push(`Archetype: ${c.identity.archetypeName}.`)
  if (c.identity.dayMaster || c.identity.dayElement) {
    const dm = c.identity.dayMaster ? `Day Master ${c.identity.dayMaster}` : 'Day Master'
    const el = c.identity.dayElement ? ` (${c.identity.dayElement}` : ''
    const st = c.identity.strength ? `, ${c.identity.strength})` : el ? ')' : ''
    L.push(`${dm}${el}${st}.`)
  }
  if (c.identity.favorableElements.length) {
    L.push(`Favorable elements: ${c.identity.favorableElements.join(', ')}.`)
  }
  if (!c.identity.archetypeName && !c.identity.dayMaster && !c.identity.favorableElements.length) {
    L.push('Identity not available yet (no birth profile / archetype).')
  }

  // Season
  L.push('')
  L.push('[what 8os knows — season (orientation, not prediction; confidence labelled)]')
  if (c.season.length) {
    for (const s of c.season) {
      const p = s.pillar ? ` ${s.pillar}` : ''
      L.push(`${s.label}${p} — ${s.verdict} [${s.confidence} confidence]: ${s.guidance}`)
    }
  } else {
    L.push('Seasonal read not available (no birth profile).')
  }

  // State
  L.push('')
  L.push('[what 8os knows — your current state (from your own ledger)]')
  L.push(`Tracked this week: ${c.state.trackedMinutes} min.`)
  if (c.state.topGoals.length) {
    L.push('Top goals by priority:')
    for (const g of c.state.topGoals) {
      L.push(`  #${g.rank} ${g.name} [${g.domain}] — ${g.sharePct}% share, ${g.momentum}, ${g.minutes} min.`)
    }
  } else {
    L.push('No active goals with ledger signal yet.')
  }
  if (c.state.alignmentHeadline) L.push(`Alignment verdict: ${c.state.alignmentHeadline}`)
  if (c.state.topRedirection) L.push(`Suggested redirection: ${c.state.topRedirection}`)
  if (c.state.todayEvents.length) {
    L.push(`Today's calendar (${c.state.todayEvents.length}):`)
    for (const e of c.state.todayEvents.slice(0, 6)) {
      const t = new Date(e.startsAt).toISOString().slice(11, 16)
      L.push(`  ${t}Z ${e.title}${e.source === 'external' ? ' (external)' : ''}`)
    }
  } else {
    L.push("Today's calendar is clear.")
  }

  // Memory — E-5/E-6. Top-k durable memory_items + open commitments, ranked
  // salience × recency × goal relevance. User-editable at /dashboard/memory
  // (deleting there removes an item from this block). Never silently inferred
  // from sensitive categories: only what the user wrote or confirmed appears.
  L.push('')
  L.push('[what 8os remembers — user-editable]')
  if (c.memory.items.length) {
    for (const m of c.memory.items) {
      L.push(`- (${m.kind}${m.pinned ? ', pinned' : ''}) ${m.content}`)
    }
  } else {
    L.push('Nothing durable remembered yet.')
  }
  if (c.memory.commitments.length) {
    L.push('Open commitments:')
    for (const cm of c.memory.commitments) {
      L.push(`  • ${cm.content}${cm.dueDate ? ` (due ${cm.dueDate})` : ''}`)
    }
  }

  return L.join('\n')
}
