/**
 * Alignment Engine (OS-2542 step 2) — attribution pipeline + attention ledger
 * + alignment verdicts.
 *
 * Answers: "is my attention pointed at my goals, and at the right goal for
 * this season?" — from the user's ACTUAL life (calendar hours, completed
 * tasks, journal entries, assistant chat), not numeric progress-%.
 *
 * Three stages, all incremental and bounded (designed to run on-demand on
 * GET /api/alignment — no cron infra):
 *
 *  1. runAttribution(userId)  — gathers unattributed items in the window and
 *     classifies each against the user's active goals. Tasks (and calendar
 *     events linked to tasks) that carry a goalId are ground-truth `direct`
 *     — no LLM. Everything else is batched into ONE Flow AI call per ~20
 *     items. Results are persisted in `alignment_attributions`
 *     (UNIQUE(sourceType, sourceId) — each item is classified once, ever).
 *
 *  2. computeLedger(userId)   — aggregates attributions into per-(goal, day)
 *     `attention_ledger` rows: minutes (calendar durations), actions
 *     (completed tasks), mentions (journal entries + chat messages).
 *     goalId=NULL is the "unaligned" bucket. `unrelated`/`counter` items land
 *     in the unaligned bucket; `direct`/`supporting` feed their goal. The
 *     window is rebuilt with DELETE+INSERT in a transaction (idempotent).
 *
 *  3. computeAlignment(userId) — blends attention share per goal (minutes 50%
 *     / actions 30% / mentions 20%) over the window and compares it against
 *     (a) the user's stated priority order (goal_rankings; default = seeded
 *     goal order) and (b) the BaZi phase engine's in-season domain verdicts
 *     (same domainFavorability the rest of the product uses). Produces
 *     per-goal momentum (fed | flat | starving), a daily + weekly verdict,
 *     a topRedirection nudge and receipts. Wording here is directional and
 *     archetype-agnostic — the UI layer adds voice later.
 *
 * Deliberate signal choices (documented for step 3+):
 *  - Tasks count only when COMPLETED (completedAt in window). Creating a task
 *    is intent, not attention — and onboarding seeds a task tree, which would
 *    otherwise mark every goal as "fed" on day 0.
 *  - Scheduled tasks already materialize a calendar event (see /api/tasks
 *    POST), so tasks contribute `actions` and calendar events contribute
 *    `minutes` — no double counting.
 */
import { createHash } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { createChatCompletion, type ChatMessage } from '@/lib/flow-ai'
import { decrypt } from '@/lib/encryption'
import { calculateBazi } from '@/lib/bazi'
import { calculateDayMasterStrength } from '@/lib/bazi-strength'
import { domainFavorability, type Element, type Verdict } from '@/lib/bazi-phases'
import { getUserTimezone, userLocalDayUTC } from '@/lib/user-time'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SourceType = 'calendar' | 'task' | 'journal' | 'chat' | 'external_calendar'
export type AttributionWeight = 'direct' | 'supporting' | 'unrelated' | 'counter'
export type Momentum = 'fed' | 'flat' | 'starving'

const WEIGHTS: readonly AttributionWeight[] = ['direct', 'supporting', 'unrelated', 'counter']

interface GoalLite {
  id: string
  name: string
  definition: string
  domainId: string
  horizon?: string
}

interface CandidateItem {
  sourceType: SourceType
  sourceId: string
  sourceDate: Date // UTC midnight of the day the item belongs to
  minutes: number // >0 only for calendar events
  text: string // what the classifier sees
  groundTruthGoalId: string | null // set → skip LLM, weight=direct
  cacheKey: string | null // E-8: (title|attendee-domains|goal-set-version) — classify-once reuse
}

export interface AttributionRunStats {
  scanned: number
  alreadyAttributed: number
  groundTruth: number
  llmClassified: number
  llmUnclassified: number
  llmBatches: number
  llmDeferred: number // over cap or failed batch — retried on the next run
  cacheReused: number // E-8: items resolved from a prior classification (recurring events)
  budgetDegraded: boolean // E-8: per-user daily token budget tripped — adhoc work skipped this run
  errors: string[]
}

export interface PerGoalAlignment {
  goalId: string
  name: string
  domain: string
  rank: number
  share: number // blended attention share 0..1
  expectedShare: number // priority-implied share 0..1
  minutes: number
  actions: number
  mentions: number
  momentum: Momentum
  inSeason: boolean | null // null = no birth profile / phase engine unavailable
  seasonVerdict: Verdict | null
}

export interface AlignmentReceipt {
  attributionId: string // E-8: lets the UI make the receipt tappable → /api/alignment/correct
  sourceType: SourceType
  sourceDate: string // YYYY-MM-DD
  goalId: string | null // E-8: current effective goal id (so the correction sheet can preselect)
  goal: string | null
  weight: AttributionWeight
  minutes: number
  rationale: string
  confidence: number | null // E-8: classifier confidence 0..1 (null for ground-truth)
  userOverride: boolean // E-8: true when a human has corrected this attribution
}

export interface AlignmentResult {
  asOf: string
  windowDays: number
  correctionRate: number // E-8: corrections / total attributions in the window (accuracy gauge)
  correctionStats: { total: number; corrected: number }
  daily: { headline: string; unalignedShare: number | null }
  weekly: {
    headline: string
    topRedirection: string
    perGoal: PerGoalAlignment[]
    unalignedShare: number
    receipts: AlignmentReceipt[]
  }
}

// ─── Small helpers ────────────────────────────────────────────────────────────

const DAY_MS = 86400000
const LLM_BATCH_SIZE = 20

// ─── E-8: classify-once cache + few-shot + budget ───────────────────────────

/** Per-user daily cap on attribution LLM tokens. A backstop for pathological
 * loops, NOT a normal-use throttle (envelope math: ~15 items/user/day). Once
 * breached in the user's local day, runAttribution serves whatever is already
 * attributed and skips new LLM work — the daily brief still runs. */
const ATTRIBUTION_DAILY_TOKEN_BUDGET = 200_000
/** How many recent corrections to include as few-shot calibration examples. */
const CORRECTION_FEWSHOT_LIMIT = 10

const sha = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 24)

/** Stable version tag for the user's active goal SET (ids + names + defs). A
 * cache key is only valid within one goal-set version — reclassify if goals
 * change. Order-independent (goals are sorted first). */
function goalSetVersion(goals: GoalLite[]): string {
  const parts = goals
    .map((g) => `${g.id}:${g.name}:${clip(g.definition, 80)}`)
    .sort()
    .join('|')
  return sha(parts)
}

/** Normalized attendee-domain hash (sorted, deduped) for calendar items. */
function attendeeDomainsHash(attendeesJson: unknown): string {
  if (!Array.isArray(attendeesJson)) return ''
  const domains = Array.from(new Set(
    (attendeesJson as Array<{ email?: unknown }>)
      .map((a) => (a && typeof a.email === 'string' && a.email.includes('@') ? a.email.split('@')[1].toLowerCase() : null))
      .filter((d): d is string => !!d),
  )).sort()
  return domains.join(',')
}

/** The classify-once cache key: title-hash + attendee-domains-hash +
 * goal-set-version. Recurring meetings (same title + attendees) reuse the prior
 * classification instead of re-paying the LLM. Only meaningful for calendar-ish
 * items with a stable title; journal/chat get null (each is unique). */
function cacheKeyFor(titleText: string, attendeesHash: string, gsv: string): string {
  const titleHash = sha(titleText.replace(/\s+/g, ' ').trim().toLowerCase())
  return sha(`${titleHash}|${attendeesHash}|${gsv}`)
}

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
// E-0 (OS-2651): day-bucket an INSTANT by the user's local calendar date
// (UTC-midnight representation, same shape as utcDay). Date-only columns
// (e.g. JournalEntry.entryDate) keep utcDay — they are already civil dates.
function localDay(tz: string, d: Date): Date {
  return userLocalDayUTC(tz, d)
}
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}
function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

// ─── Stage 1: attribution ─────────────────────────────────────────────────────

export async function runAttribution(
  userId: string,
  opts: { sinceDays?: number; maxLlmItems?: number } = {},
): Promise<AttributionRunStats> {
  const sinceDays = Math.min(Math.max(opts.sinceDays ?? 7, 1), 60)
  const maxLlmItems = Math.min(Math.max(opts.maxLlmItems ?? 60, 0), 400)
  const now = new Date()
  const tz = await getUserTimezone(userId) // explicit per-user tz (E-0/OS-2651)
  const since = new Date(localDay(tz, now).getTime() - sinceDays * DAY_MS)

  const stats: AttributionRunStats = {
    scanned: 0,
    alreadyAttributed: 0,
    groundTruth: 0,
    llmClassified: 0,
    llmUnclassified: 0,
    llmBatches: 0,
    llmDeferred: 0,
    cacheReused: 0,
    budgetDegraded: false,
    errors: [],
  }

  const goals: GoalLite[] = await prisma.goal.findMany({
    where: { userId, status: 'active' },
    select: { id: true, name: true, definition: true, domainId: true, horizon: true },
    orderBy: { createdAt: 'asc' },
    take: 30,
  })
  if (goals.length === 0) return stats // nothing to align against yet

  // E-8: the goal-set version — cache keys are only valid within one version.
  const gsv = goalSetVersion(goals)

  // E-8: per-user daily token budget (backstop). If the user already burned the
  // attribution budget for their LOCAL day, skip new LLM work — ground-truth
  // links still get attributed (free), and the daily brief is never blocked.
  const spentToday = await attributionTokensSpentToday(userId, tz)
  const budgetTripped = spentToday >= ATTRIBUTION_DAILY_TOKEN_BUDGET
  if (budgetTripped) stats.budgetDegraded = true

  // ── Gather candidates in the window ──
  const [events, tasks, entries, chatMsgs, externalEvents] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: since, lte: new Date(now.getTime() + DAY_MS) } },
      select: { id: true, title: true, description: true, startAt: true, endAt: true, taskId: true },
      take: 500,
    }),
    // Completed tasks only — see the header note on why creation ≠ attention.
    prisma.oSTask.findMany({
      where: { userId, completedAt: { gte: since } },
      select: {
        id: true, name: true, notes: true, goalId: true, completedAt: true,
        project: { select: { goalId: true } },
      },
      take: 500,
    }),
    prisma.journalEntry.findMany({
      where: { userId, entryDate: { gte: since } },
      select: { id: true, content: true, kind: true, entryDate: true },
      take: 300,
    }),
    prisma.assistantMessage.findMany({
      where: { role: 'user', createdAt: { gte: since }, conversation: { userId } },
      select: { id: true, content: true, createdAt: true },
      take: 300,
    }),
    // E-1 (backlog §4.2): ingested external calendar events — read-only truth,
    // consumed identically to native calendar items (minutes from duration).
    prisma.externalEvent.findMany({
      where: { userId, isDeleted: false, startsAt: { gte: since, lte: new Date(now.getTime() + DAY_MS) } },
      select: { id: true, title: true, startsAt: true, endsAt: true, icalUid: true, attendeesJson: true },
      take: 500,
    }),
  ])

  // Calendar events linked to a task inherit that task's goal (ground truth).
  const linkedTaskIds = events.map((e) => e.taskId).filter((t): t is string => !!t)
  const linkedTasks = linkedTaskIds.length
    ? await prisma.oSTask.findMany({
        where: { id: { in: linkedTaskIds } },
        select: { id: true, goalId: true, project: { select: { goalId: true } } },
      })
    : []
  const taskGoal = new Map(linkedTasks.map((t) => [t.id, t.goalId ?? t.project?.goalId ?? null]))

  const goalIds = new Set(goals.map((g) => g.id))
  const candidates: CandidateItem[] = []

  for (const e of events) {
    const minutes = Math.max(0, Math.min(960, Math.round((e.endAt.getTime() - e.startAt.getTime()) / 60000)))
    const linkedGoal = e.taskId ? taskGoal.get(e.taskId) ?? null : null
    // E-8: recurring native meetings (same title) classify once. No attendees
    // natively → empty domain hash. Untitled events get no cache key.
    const ck = e.title ? cacheKeyFor(e.title, '', gsv) : null
    candidates.push({
      sourceType: 'calendar',
      sourceId: e.id,
      sourceDate: localDay(tz, e.startAt),
      minutes,
      text: clip(`${e.title}${e.description ? ` — ${e.description}` : ''}`, 300),
      groundTruthGoalId: linkedGoal && goalIds.has(linkedGoal) ? linkedGoal : null,
      cacheKey: ck,
    })
  }
  for (const t of tasks) {
    const gt = t.goalId ?? t.project?.goalId ?? null
    candidates.push({
      sourceType: 'task',
      sourceId: t.id,
      sourceDate: localDay(tz, t.completedAt ?? now),
      minutes: 0,
      text: clip(`Completed task: ${t.name}${t.notes ? ` — ${t.notes}` : ''}`, 300),
      groundTruthGoalId: gt && goalIds.has(gt) ? gt : null,
      cacheKey: null, // tasks are one-off; ground-truth links or unique text
    })
  }
  for (const j of entries) {
    candidates.push({
      sourceType: 'journal',
      sourceId: j.id,
      sourceDate: utcDay(j.entryDate),
      minutes: 0,
      text: clip(`Journal (${j.kind}): ${j.content}`, 600),
      groundTruthGoalId: null,
      cacheKey: null, // each entry is unique
    })
  }
  for (const m of chatMsgs) {
    if (!m.content) continue
    candidates.push({
      sourceType: 'chat',
      sourceId: m.id,
      sourceDate: localDay(tz, m.createdAt),
      minutes: 0,
      text: clip(`Message to assistant: ${m.content}`, 400),
      groundTruthGoalId: null,
      cacheKey: null, // each message is unique
    })
  }
  // External calendar events (E-1) — same classification lane as native
  // calendar events: title (+ attendee domains when present) → LLM, minutes
  // from duration. DEDUPE GUARD: an event that exists BOTH natively and
  // upstream (a self-scheduled block exported to Google, or an imported copy)
  // must not be double-counted — skip the external copy when its ical_uid
  // embeds a native event id, or when its normalized title matches an
  // overlapping native event.
  const normTitle = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()
  for (const x of externalEvents) {
    const dup = events.some(
      (e) =>
        (!!x.icalUid && x.icalUid.includes(e.id)) ||
        (normTitle(x.title) !== '' && normTitle(e.title) === normTitle(x.title) && e.startAt < x.endsAt && e.endAt > x.startsAt),
    )
    if (dup) continue
    const minutes = Math.max(0, Math.min(960, Math.round((x.endsAt.getTime() - x.startsAt.getTime()) / 60000)))
    let attendeeNote = ''
    if (Array.isArray(x.attendeesJson)) {
      const domains = Array.from(new Set(
        (x.attendeesJson as Array<{ email?: unknown }>)
          .map((a) => (a && typeof a.email === 'string' && a.email.includes('@') ? a.email.split('@')[1] : null))
          .filter((d): d is string => !!d),
      )).slice(0, 5)
      if (domains.length > 0) attendeeNote = ` — attendees from: ${domains.join(', ')}`
    }
    // E-8: recurring external meetings dominate calendar data — key on
    // (title-hash, attendee-domains-hash, goal-set-version) so a daily standup
    // classifies ONCE, not every day. Full domain set (not the 5-cap display).
    const ck = x.title ? cacheKeyFor(x.title, attendeeDomainsHash(x.attendeesJson), gsv) : null
    candidates.push({
      sourceType: 'external_calendar',
      sourceId: x.id,
      sourceDate: localDay(tz, x.startsAt),
      minutes,
      text: clip(`External calendar event: ${x.title ?? '(untitled)'}${attendeeNote}`, 300),
      groundTruthGoalId: null,
      cacheKey: ck,
    })
  }

  stats.scanned = candidates.length
  if (candidates.length === 0) return stats

  // ── Skip already-attributed items (UNIQUE sourceType+sourceId) ──
  const existing = await prisma.alignmentAttribution.findMany({
    where: { userId, sourceId: { in: candidates.map((c) => c.sourceId) } },
    select: { sourceType: true, sourceId: true },
  })
  const done = new Set(existing.map((e) => `${e.sourceType}:${e.sourceId}`))
  const pending = candidates.filter((c) => !done.has(`${c.sourceType}:${c.sourceId}`))
  stats.alreadyAttributed = candidates.length - pending.length
  if (pending.length === 0) return stats

  type NewRow = {
    userId: string
    sourceType: string
    sourceId: string
    sourceDate: Date
    goalId: string | null
    weight: string
    minutes: number
    rationale: string
    confidence: number | null
    cacheKey: string | null
  }
  const rows: NewRow[] = []

  // Ground truth: explicit goal link — no LLM needed (confidence = full).
  const groundTruth = pending.filter((c) => c.groundTruthGoalId)
  for (const c of groundTruth) {
    rows.push({
      userId,
      sourceType: c.sourceType,
      sourceId: c.sourceId,
      sourceDate: c.sourceDate,
      goalId: c.groundTruthGoalId,
      weight: 'direct',
      minutes: c.minutes,
      rationale: 'Explicitly linked to this goal (ground truth — no classification needed).',
      confidence: 1,
      cacheKey: c.cacheKey,
    })
  }
  stats.groundTruth = groundTruth.length

  // E-8 classify-once: for items carrying a cacheKey, reuse a PRIOR
  // classification with the SAME key (same recurring meeting under the same
  // goal set) instead of re-paying the LLM. This is what makes a daily standup
  // classify once, not daily.
  const llmCandidates = pending.filter((c) => !c.groundTruthGoalId)
  const cacheKeys = Array.from(new Set(llmCandidates.map((c) => c.cacheKey).filter((k): k is string => !!k)))
  const cacheMap = new Map<string, { goalId: string | null; weight: string; rationale: string; confidence: number | null }>()
  if (cacheKeys.length > 0) {
    const priors = await prisma.alignmentAttribution.findMany({
      where: { userId, cacheKey: { in: cacheKeys } },
      orderBy: { createdAt: 'desc' },
      select: { cacheKey: true, goalId: true, weight: true, rationale: true, confidence: true },
    })
    for (const p of priors) {
      if (p.cacheKey && !cacheMap.has(p.cacheKey)) {
        cacheMap.set(p.cacheKey, { goalId: p.goalId, weight: p.weight, rationale: p.rationale, confidence: p.confidence })
      }
    }
  }

  const cacheHits = llmCandidates.filter((c) => c.cacheKey && cacheMap.has(c.cacheKey))
  for (const c of cacheHits) {
    const prior = cacheMap.get(c.cacheKey as string) as NonNullable<ReturnType<typeof cacheMap.get>>
    rows.push({
      userId,
      sourceType: c.sourceType,
      sourceId: c.sourceId,
      sourceDate: c.sourceDate,
      goalId: prior.goalId,
      weight: prior.weight,
      minutes: c.minutes,
      rationale: prior.rationale,
      confidence: prior.confidence,
      cacheKey: c.cacheKey,
    })
    stats.cacheReused += 1
  }

  // LLM-needing items (no PRIOR cache hit), newest first, bounded per run.
  const llmMiss = llmCandidates
    .filter((c) => !(c.cacheKey && cacheMap.has(c.cacheKey)))
    .sort((a, b) => b.sourceDate.getTime() - a.sourceDate.getTime())

  // E-8 classify-once WITHIN a run: when several NEW items in the same run share
  // a cacheKey (e.g. two occurrences of the same recurring meeting seeded/synced
  // together), only the FIRST is sent to the LLM; the rest reuse its result. So
  // a recurring meeting is classified exactly ONCE, whether the duplicates
  // arrive across runs (prior-cache path) or in the same run (this path).
  const seenKeys = new Set<string>()
  const llmAll: CandidateItem[] = []
  const intraDupes: CandidateItem[] = []
  for (const c of llmMiss) {
    if (c.cacheKey) {
      if (seenKeys.has(c.cacheKey)) { intraDupes.push(c); continue }
      seenKeys.add(c.cacheKey)
    }
    llmAll.push(c)
  }

  // E-8 budget backstop: if the daily token budget is already blown, DO NOT
  // start new LLM work this run (ground-truth + cache reuse above are free).
  const llmNow = budgetTripped ? [] : llmAll.slice(0, maxLlmItems)
  stats.llmDeferred += llmAll.length - llmNow.length

  // E-8 personal calibration: the user's 10 most recent corrections become
  // few-shot examples so the classifier learns THIS user's boundaries.
  const fewShot = llmNow.length > 0 ? await recentCorrectionExamples(userId, goals) : []

  // Track approximate LLM tokens spent this run for the daily-budget rollup.
  let tokensThisRun = 0
  // The result each cacheKey resolved to this run, so same-run dupes reuse it.
  const runResults = new Map<string, { goalId: string | null; weight: string; rationale: string; confidence: number | null }>()

  for (let i = 0; i < llmNow.length; i += LLM_BATCH_SIZE) {
    const batch = llmNow.slice(i, i + LLM_BATCH_SIZE)
    try {
      const { results: classified, tokens } = await classifyBatch(goals, batch, fewShot)
      tokensThisRun += tokens
      stats.llmBatches += 1
      for (const c of batch) {
        const r = classified.get(`${c.sourceType}:${c.sourceId}`)
        if (r) {
          rows.push({
            userId,
            sourceType: c.sourceType,
            sourceId: c.sourceId,
            sourceDate: c.sourceDate,
            goalId: r.goalId,
            weight: r.weight,
            minutes: c.minutes,
            rationale: r.rationale,
            confidence: r.confidence,
            cacheKey: c.cacheKey,
          })
          stats.llmClassified += 1
          if (c.cacheKey) runResults.set(c.cacheKey, { goalId: r.goalId, weight: r.weight, rationale: r.rationale, confidence: r.confidence })
        } else {
          // The call succeeded but this item was missing/invalid in the
          // response — record it as unrelated so we don't re-pay every run.
          rows.push({
            userId,
            sourceType: c.sourceType,
            sourceId: c.sourceId,
            sourceDate: c.sourceDate,
            goalId: null,
            weight: 'unrelated',
            minutes: c.minutes,
            rationale: 'Unclassified: classifier response missing or invalid for this item.',
            confidence: null,
            cacheKey: c.cacheKey,
          })
          stats.llmUnclassified += 1
        }
      }
    } catch (err) {
      // Whole batch failed (network/provider) — leave unattributed for retry.
      stats.llmDeferred += batch.length
      stats.errors.push(`classify batch failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // E-8: same-run duplicates reuse their representative's classification (the
  // recurring meeting was classified exactly ONCE this run). Any dupe whose
  // representative wasn't classified this run (budget/cap/failed batch) is
  // deferred and resolves on the next run.
  for (const c of intraDupes) {
    const key = c.cacheKey as string
    const prior = runResults.get(key)
    if (prior) {
      rows.push({
        userId,
        sourceType: c.sourceType,
        sourceId: c.sourceId,
        sourceDate: c.sourceDate,
        goalId: prior.goalId,
        weight: prior.weight,
        minutes: c.minutes,
        rationale: prior.rationale,
        confidence: prior.confidence,
        cacheKey: key,
      })
      stats.cacheReused += 1
    } else {
      stats.llmDeferred += 1
    }
  }

  if (rows.length > 0) {
    await prisma.alignmentAttribution.createMany({ data: rows, skipDuplicates: true })
  }
  // E-8 budget: record this run's attribution token cost (agent_runs pattern).
  if (tokensThisRun > 0) await recordAttributionTokens(userId, tokensThisRun, stats).catch(() => {})
  return stats
}

export interface CorrectionExample {
  text: string
  correctedGoalName: string | null // null = user marked it "unaligned"
}

type ClassifyResult = { goalId: string | null; weight: AttributionWeight; rationale: string; confidence: number | null }

/** One Flow AI call classifying up to ~20 items against the goal list.
 * E-8: runs on the cheap `attribution` lane, returns a per-item confidence,
 * and is calibrated by the user's recent corrections (few-shot). Also returns
 * the total tokens used so the caller can enforce the daily budget. */
async function classifyBatch(
  goals: GoalLite[],
  items: CandidateItem[],
  fewShot: CorrectionExample[] = [],
): Promise<{ results: Map<string, ClassifyResult>; tokens: number }> {
  const goalIds = new Set(goals.map((g) => g.id))
  const systemLines = [
    'You are an attention-attribution classifier inside a goal-alignment engine.',
    'You receive a user\'s goals and a list of activity items (calendar events — including external/Google-synced ones, completed tasks, journal entries, messages to their assistant).',
    'For EACH item decide which single goal (if any) the item\'s attention feeds, and how:',
    '- "direct": the item IS work on / engagement with that goal.',
    '- "supporting": the item indirectly helps that goal (prep, research, recovery FOR it, talking it through).',
    '- "unrelated": the item does not meaningfully relate to any listed goal (errands, admin, unrelated leisure). goalId MUST be null.',
    '- "counter": the item actively works AGAINST a goal (set goalId to that goal).',
    'Also return a "confidence" between 0 and 1 for each item: how sure you are of the (goal, weight) call (1 = certain, 0 = a guess).',
    'Rules: use ONLY goal ids from the provided list. When unsure between two goals, pick the closest and use "supporting". When nothing plausibly relates, use "unrelated" with goalId null — do NOT force a match. Keep each rationale under 20 words, plain and concrete.',
    'Respond with ONLY a JSON array — no markdown fences, no commentary. One object per input item, echoing its sourceType and sourceId exactly:',
    '[{"sourceType":"...","sourceId":"...","goalId":"<goal id or null>","weight":"direct|supporting|unrelated|counter","confidence":0.0,"rationale":"..."}]',
  ]
  // E-8 personal calibration: the user has previously corrected similar items.
  // Present those as ground truth so the classifier matches THIS user's sense.
  if (fewShot.length > 0) {
    systemLines.push(
      '',
      'This user has previously CORRECTED classifications. Treat these as ground truth and match their judgment on similar items:',
      ...fewShot.map((f) => `- "${clip(f.text, 120)}" → ${f.correctedGoalName ? `goal "${f.correctedGoalName}"` : 'UNALIGNED (no goal)'}`),
    )
  }
  const messages: ChatMessage[] = [
    { role: 'system', content: systemLines.join('\n') },
    {
      role: 'user',
      content: JSON.stringify({
        goals: goals.map((g) => ({ id: g.id, name: g.name, domain: g.domainId, definition: clip(g.definition, 200) })),
        items: items.map((c) => ({ sourceType: c.sourceType, sourceId: c.sourceId, date: dayKey(c.sourceDate), text: c.text })),
      }),
    },
  ]

  // E-8: cheapest capable model via the `attribution` cost lane.
  const resp = await createChatCompletion(messages, { lane: 'attribution', temperature: 0.1, max_tokens: 3000 })
  const content = resp.choices?.[0]?.message?.content ?? ''
  const tokens = resp.usage?.total_tokens ?? 0

  // Defensive parse: strip fences, take the outermost [...] slice.
  const start = content.indexOf('[')
  const end = content.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) throw new Error('classifier returned no JSON array')
  let parsed: unknown
  try {
    parsed = JSON.parse(content.slice(start, end + 1))
  } catch {
    throw new Error('classifier returned unparseable JSON')
  }
  if (!Array.isArray(parsed)) throw new Error('classifier JSON is not an array')

  const out = new Map<string, ClassifyResult>()
  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const sourceType = typeof r.sourceType === 'string' ? r.sourceType : null
    const sourceId = typeof r.sourceId === 'string' ? r.sourceId : null
    if (!sourceType || !sourceId) continue
    let weight = (typeof r.weight === 'string' ? r.weight : 'unrelated') as AttributionWeight
    if (!WEIGHTS.includes(weight)) weight = 'unrelated'
    let goalId = typeof r.goalId === 'string' && goalIds.has(r.goalId) ? r.goalId : null
    if (!goalId && (weight === 'direct' || weight === 'supporting' || weight === 'counter')) weight = 'unrelated'
    if (weight === 'unrelated') goalId = null
    const rationale = clip(typeof r.rationale === 'string' ? r.rationale : '', 300)
    // Clamp confidence to [0,1]; null when the model omitted/garbled it.
    let confidence: number | null = null
    const rawConf = r.confidence
    if (typeof rawConf === 'number' && Number.isFinite(rawConf)) confidence = Math.max(0, Math.min(1, rawConf))
    else if (typeof rawConf === 'string' && rawConf.trim() !== '' && Number.isFinite(Number(rawConf))) confidence = Math.max(0, Math.min(1, Number(rawConf)))
    out.set(`${sourceType}:${sourceId}`, { goalId, weight, rationale, confidence })
  }
  return { results: out, tokens }
}

// ─── Stage 2: attention ledger ────────────────────────────────────────────────

export async function computeLedger(
  userId: string,
  opts: { days?: number } = {},
): Promise<{ rows: number; days: number }> {
  const days = Math.min(Math.max(opts.days ?? 7, 1), 60)
  const tz = await getUserTimezone(userId)
  const since = new Date(localDay(tz, new Date()).getTime() - days * DAY_MS)

  const atts = await prisma.alignmentAttribution.findMany({
    where: { userId, sourceDate: { gte: since } },
    select: { sourceType: true, sourceDate: true, goalId: true, weight: true, minutes: true, userOverride: true, correctedGoalId: true },
    take: 5000,
  })

  const agg = new Map<string, { goalId: string | null; day: string; minutes: number; actions: number; mentions: number }>()
  for (const a of atts) {
    // E-8: a human correction WINS. corrected_goal_id set → that goal (direct);
    // override with null corrected goal → forced unaligned. Otherwise the
    // classifier's call stands (direct + supporting feed the goal; unrelated +
    // counter land unaligned).
    let goalId: string | null
    if (a.userOverride) {
      goalId = a.correctedGoalId ?? null
    } else {
      const aligned = (a.weight === 'direct' || a.weight === 'supporting') && a.goalId
      goalId = aligned ? a.goalId : null
    }
    const day = dayKey(a.sourceDate)
    const key = `${goalId ?? ''}|${day}`
    let e = agg.get(key)
    if (!e) {
      e = { goalId, day, minutes: 0, actions: 0, mentions: 0 }
      agg.set(key, e)
    }
    if (a.sourceType === 'calendar' || a.sourceType === 'external_calendar') e.minutes += a.minutes
    else if (a.sourceType === 'task') e.actions += 1
    else if (a.sourceType === 'journal' || a.sourceType === 'chat') e.mentions += 1
  }

  const rows = Array.from(agg.values())
  await prisma.$transaction([
    prisma.attentionLedger.deleteMany({ where: { userId, day: { gte: since } } }),
    prisma.attentionLedger.createMany({
      data: rows.map((r) => ({
        userId,
        goalId: r.goalId,
        day: new Date(`${r.day}T00:00:00.000Z`),
        minutes: r.minutes,
        actions: r.actions,
        mentions: r.mentions,
      })),
    }),
  ])
  return { rows: rows.length, days }
}

// ─── Stage 3: alignment verdict ───────────────────────────────────────────────

/** In-season verdict per goal DOMAIN via the phase engine; null when no profile. */
async function seasonVerdicts(userId: string): Promise<Record<string, Verdict> | null> {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { birthDateEncrypted: true, birthTimeEncrypted: true, dayElement: true },
    })
    if (!profile?.birthDateEncrypted) return null
    const birthDate = decrypt(profile.birthDateEncrypted)
    const birthTime = profile.birthTimeEncrypted ? decrypt(profile.birthTimeEncrypted) : null
    const [y, m, d] = birthDate.split('-').map(Number)
    const [hh, mm] = birthTime ? birthTime.split(':').map(Number) : [12, 0]
    const natal = calculateBazi(y, m, d, hh, mm)
    const strength = calculateDayMasterStrength(natal).strength
    const dayElement = (profile.dayElement || natal.dayElement) as Element
    const fav = domainFavorability(dayElement, strength)
    const out: Record<string, Verdict> = {}
    for (const k of Object.keys(fav)) out[k] = fav[k].verdict
    return out
  } catch {
    return null
  }
}

function momentumFor(share: number, expected: number): Momentum {
  if (share <= 0.001) return 'starving'
  const ratio = share / Math.max(expected, 0.001)
  if (ratio >= 0.7) return 'fed'
  if (ratio >= 0.25) return 'flat'
  return 'starving'
}

interface Totals { minutes: number; actions: number; mentions: number }

/** Blended attention share: minutes 50% / actions 30% / mentions 20%, with
 * weights renormalized over the components that have any signal at all. */
function blendedShares(rows: { key: string; t: Totals }[]): Map<string, number> {
  const total: Totals = { minutes: 0, actions: 0, mentions: 0 }
  for (const r of rows) {
    total.minutes += r.t.minutes
    total.actions += r.t.actions
    total.mentions += r.t.mentions
  }
  const comps: { k: keyof Totals; w: number }[] = [
    { k: 'minutes', w: 0.5 },
    { k: 'actions', w: 0.3 },
    { k: 'mentions', w: 0.2 },
  ]
  const active = comps.filter((c) => total[c.k] > 0)
  const wSum = active.reduce((s, c) => s + c.w, 0)
  const out = new Map<string, number>()
  for (const r of rows) {
    let share = 0
    if (wSum > 0) {
      for (const c of active) share += (c.w / wSum) * (r.t[c.k] / total[c.k])
    }
    out.set(r.key, share)
  }
  return out
}

export async function computeAlignment(
  userId: string,
  opts: { days?: number } = {},
): Promise<AlignmentResult> {
  const days = Math.min(Math.max(opts.days ?? 7, 1), 60)
  const tz = await getUserTimezone(userId)
  const today = localDay(tz, new Date()) // the USER's "today", not the server's
  const since = new Date(today.getTime() - days * DAY_MS)

  const [goals, rankings, ledger, seasons] = await Promise.all([
    prisma.goal.findMany({
      where: { userId, status: 'active' },
      select: { id: true, name: true, domainId: true },
      orderBy: { createdAt: 'asc' },
      take: 30,
    }),
    prisma.goalRanking.findMany({ where: { userId } }),
    prisma.attentionLedger.findMany({
      where: { userId, day: { gte: since } },
      select: { goalId: true, day: true, minutes: true, actions: true, mentions: true },
      take: 2000,
    }),
    seasonVerdicts(userId),
  ])

  // Priority ranks: explicit goal_rankings win; unranked goals fall back to
  // their seeded (createdAt) order. Ties are harmless — ranks only weight the
  // expected-share curve.
  const explicit = new Map(rankings.map((r) => [r.goalId, r.rank]))
  const rankOf = new Map<string, number>()
  goals.forEach((g, i) => rankOf.set(g.id, explicit.get(g.id) ?? i + 1))

  // Expected share ∝ (n - rank + 1): rank 1 gets the largest slice.
  const n = goals.length
  const rawWeight = (rank: number) => Math.max(1, n - rank + 1)
  const weightSum = goals.reduce((s, g) => s + rawWeight(rankOf.get(g.id) as number), 0)

  // Aggregate the ledger window per goal (+ the unaligned bucket).
  const byGoal = new Map<string, Totals>()
  const todayByGoal = new Map<string, Totals>()
  const bump = (map: Map<string, Totals>, key: string, r: Totals) => {
    const e = map.get(key) ?? { minutes: 0, actions: 0, mentions: 0 }
    e.minutes += r.minutes
    e.actions += r.actions
    e.mentions += r.mentions
    map.set(key, e)
  }
  for (const r of ledger) {
    const key = r.goalId ?? ''
    bump(byGoal, key, r)
    if (dayKey(r.day) === dayKey(today)) bump(todayByGoal, key, r)
  }

  const shareRows = [
    ...goals.map((g) => ({ key: g.id, t: byGoal.get(g.id) ?? { minutes: 0, actions: 0, mentions: 0 } })),
    { key: '', t: byGoal.get('') ?? { minutes: 0, actions: 0, mentions: 0 } },
  ]
  const shares = blendedShares(shareRows)
  const anySignal = shareRows.some((r) => r.t.minutes + r.t.actions + r.t.mentions > 0)

  const perGoal: PerGoalAlignment[] = goals
    .map((g) => {
      const t = byGoal.get(g.id) ?? { minutes: 0, actions: 0, mentions: 0 }
      const rank = rankOf.get(g.id) as number
      const share = shares.get(g.id) ?? 0
      const expectedShare = weightSum > 0 ? rawWeight(rank) / weightSum : 0
      const verdict = seasons ? seasons[g.domainId] ?? null : null
      return {
        goalId: g.id,
        name: g.name,
        domain: g.domainId,
        rank,
        share: round3(share),
        expectedShare: round3(expectedShare),
        minutes: t.minutes,
        actions: t.actions,
        mentions: t.mentions,
        momentum: anySignal ? momentumFor(share, expectedShare) : ('starving' as Momentum),
        inSeason: verdict === null ? null : verdict === 'favorable',
        seasonVerdict: verdict,
      }
    })
    .sort((a, b) => a.rank - b.rank)

  const unalignedShare = round3(shares.get('') ?? 0)

  // ── Weekly verdict ──
  let headline: string
  if (!anySignal) {
    headline = `No attention recorded in the last ${days} days — schedule a block, finish a task or journal a line and the picture starts here.`
  } else {
    const top = [...perGoal].sort((a, b) => b.share - a.share)[0]
    headline =
      top && top.share > 0
        ? `Over the last ${days} days, most of your attention (${pct(top.share)}) fed “${top.name}”; ${pct(unalignedShare)} wasn't pointed at any goal.`
        : `Over the last ${days} days, ${pct(unalignedShare)} of your tracked attention wasn't pointed at any goal.`
  }

  // Redirection: the highest-priority starving goal (season is a tie-break /
  // color, priority is primary — you said this order matters).
  const starving = perGoal
    .filter((g) => g.momentum === 'starving')
    .sort((a, b) => a.rank - b.rank || Number(b.inSeason === true) - Number(a.inSeason === true))
  let topRedirection: string
  if (!anySignal) {
    topRedirection = 'Nothing is being tracked yet — put one block on the calendar for your #1 priority.'
  } else if (starving.length === 0) {
    topRedirection = 'Every priority is getting some attention — hold the current balance.'
  } else {
    const g = starving[0]
    const season =
      g.inSeason === true
        ? ' — and this is a favorable season for it'
        : g.inSeason === false
          ? ' (off-season, but it is still your stated priority)'
          : ''
    topRedirection = `Your #${g.rank} priority “${g.name}” is starving: ${pct(g.share)} of your attention in the last ${days} days${season}. Point your next open block at it.`
  }

  // ── Daily verdict (today's ledger slice only) ──
  const todayRows = [
    ...goals.map((g) => ({ key: g.id, t: todayByGoal.get(g.id) ?? { minutes: 0, actions: 0, mentions: 0 } })),
    { key: '', t: todayByGoal.get('') ?? { minutes: 0, actions: 0, mentions: 0 } },
  ]
  const todayAny = todayRows.some((r) => r.t.minutes + r.t.actions + r.t.mentions > 0)
  let dailyHeadline: string
  let dailyUnaligned: number | null = null
  if (!todayAny) {
    dailyHeadline = 'Nothing tracked yet today.'
  } else {
    const tShares = blendedShares(todayRows)
    dailyUnaligned = round3(tShares.get('') ?? 0)
    const topId = Array.from(tShares.entries()).filter(([k]) => k !== '').sort((a, b) => b[1] - a[1])[0]
    const topGoal = topId && topId[1] > 0 ? goals.find((g) => g.id === topId[0]) : null
    dailyHeadline = topGoal
      ? `Today's attention is mostly on “${topGoal.name}” (${pct(topId[1])}).`
      : `Today's attention hasn't fed any goal yet (${pct(dailyUnaligned)} unaligned).`
  }

  // ── Receipts: the most recent classified evidence, goal-fed first ──
  // E-8: each carries its attribution id so the UI can make it tappable
  // (reassign → /api/alignment/correct). The displayed goal is the EFFECTIVE
  // goal — a human correction supersedes the classifier's.
  const receiptRows = await prisma.alignmentAttribution.findMany({
    where: { userId, sourceDate: { gte: since } },
    orderBy: [{ createdAt: 'desc' }],
    take: 24,
    select: {
      id: true, sourceType: true, sourceDate: true, goalId: true, weight: true,
      minutes: true, rationale: true, confidence: true, userOverride: true, correctedGoalId: true,
    },
  })
  const goalName = new Map(goals.map((g) => [g.id, g.name]))
  const effectiveGoalId = (r: { userOverride: boolean; correctedGoalId: string | null; goalId: string | null; weight: string }): string | null => {
    if (r.userOverride) return r.correctedGoalId ?? null
    return (r.weight === 'direct' || r.weight === 'supporting') ? r.goalId : null
  }
  const receipts: AlignmentReceipt[] = receiptRows
    .sort((a, b) => Number(!!effectiveGoalId(a)) - Number(!!effectiveGoalId(b)) === 0 ? 0 : (effectiveGoalId(b) ? 1 : -1))
    .slice(0, 6)
    .map((r) => {
      const gid = effectiveGoalId(r)
      return {
        attributionId: r.id,
        sourceType: r.sourceType as SourceType,
        sourceDate: dayKey(r.sourceDate),
        goalId: gid,
        goal: gid ? goalName.get(gid) ?? null : null,
        weight: r.weight as AttributionWeight,
        minutes: r.minutes,
        rationale: r.rationale,
        confidence: r.confidence ?? null,
        userOverride: r.userOverride,
      }
    })

  // E-8: correction RATE — the attribution-accuracy gauge (< 10% target).
  const [totalAtt, correctedAtt] = await Promise.all([
    prisma.alignmentAttribution.count({ where: { userId, sourceDate: { gte: since } } }),
    prisma.alignmentAttribution.count({ where: { userId, sourceDate: { gte: since }, userOverride: true } }),
  ])
  const correctionRate = totalAtt > 0 ? round3(correctedAtt / totalAtt) : 0

  return {
    asOf: new Date().toISOString(),
    windowDays: days,
    correctionRate,
    correctionStats: { total: totalAtt, corrected: correctedAtt },
    daily: { headline: dailyHeadline, unalignedShare: dailyUnaligned },
    weekly: { headline, topRedirection, perGoal, unalignedShare, receipts },
  }
}

// ─── E-8: corrections, calibration, budget ──────────────────────────────────

export interface CorrectionResult {
  ok: boolean
  reason?: string
  attribution?: { id: string; userOverride: boolean; correctedGoalId: string | null; weight: string }
}

/** Apply a human correction to one attribution: reassign it to `correctedGoalId`
 * (or null = mark UNALIGNED). Sets user_override=true so runAttribution never
 * re-classifies it. The goal must belong to the same user (or be null). */
export async function applyCorrection(
  userId: string,
  attributionId: string,
  correctedGoalId: string | null,
): Promise<CorrectionResult> {
  const row = await prisma.alignmentAttribution.findUnique({
    where: { id: attributionId },
    select: { id: true, userId: true },
  })
  if (!row || row.userId !== userId) return { ok: false, reason: 'attribution not found' }

  if (correctedGoalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: correctedGoalId, userId },
      select: { id: true },
    })
    if (!goal) return { ok: false, reason: 'goal not found for this user' }
  }

  // A correction to a concrete goal is authoritative → weight becomes 'direct'
  // (the human says it feeds this goal). A null correction → 'unrelated'.
  const weight = correctedGoalId ? 'direct' : 'unrelated'
  const updated = await prisma.alignmentAttribution.update({
    where: { id: attributionId },
    data: {
      userOverride: true,
      correctedGoalId,
      goalId: correctedGoalId, // keep goalId coherent with the corrected goal
      weight,
      confidence: 1, // a human said so
      rationale: correctedGoalId ? 'Reassigned by you.' : 'Marked unaligned by you.',
    },
    select: { id: true, userOverride: true, correctedGoalId: true, weight: true },
  })
  return { ok: true, attribution: updated }
}

/** The user's N most recent corrections, as few-shot examples (text → goal|null). */
async function recentCorrectionExamples(userId: string, goals: GoalLite[]): Promise<CorrectionExample[]> {
  const rows = await prisma.alignmentAttribution.findMany({
    where: { userId, userOverride: true },
    orderBy: { createdAt: 'desc' },
    take: CORRECTION_FEWSHOT_LIMIT,
    select: { sourceType: true, sourceId: true, correctedGoalId: true, rationale: true },
  })
  if (rows.length === 0) return []
  const goalName = new Map(goals.map((g) => [g.id, g.name]))

  // Recover a short text description for each corrected item so the example is
  // meaningful. Cheap best-effort lookups by source id.
  const examples: CorrectionExample[] = []
  for (const r of rows) {
    let text = ''
    try {
      if (r.sourceType === 'calendar') {
        const e = await prisma.calendarEvent.findUnique({ where: { id: r.sourceId }, select: { title: true } })
        text = e?.title ?? ''
      } else if (r.sourceType === 'external_calendar') {
        const e = await prisma.externalEvent.findUnique({ where: { id: r.sourceId }, select: { title: true } })
        text = e?.title ?? ''
      } else if (r.sourceType === 'task') {
        const t = await prisma.oSTask.findUnique({ where: { id: r.sourceId }, select: { name: true } })
        text = t?.name ?? ''
      } else if (r.sourceType === 'journal') {
        const j = await prisma.journalEntry.findUnique({ where: { id: r.sourceId }, select: { content: true } })
        text = j?.content ?? ''
      } else if (r.sourceType === 'chat') {
        const m = await prisma.assistantMessage.findUnique({ where: { id: r.sourceId }, select: { content: true } })
        text = m?.content ?? ''
      }
    } catch {
      /* best-effort */
    }
    if (!text) continue
    examples.push({ text: clip(text, 140), correctedGoalName: r.correctedGoalId ? goalName.get(r.correctedGoalId) ?? null : null })
  }
  return examples
}

// ─── E-8: per-user daily attribution token budget (backstop) ────────────────
//
// Reuses the agent_runs.token_cost_json pattern: one lightweight AgentRun per
// user per local day, kind='attribution_budget', whose tokenCostJson.total
// accumulates the day's attribution LLM tokens. On breach, runAttribution skips
// NEW LLM work (ground-truth + cache reuse stay free; the daily brief is never
// blocked). This catches pathological loops, not normal use.

const BUDGET_KIND = 'attribution_budget'
const budgetKey = (userId: string, dayStart: Date) => `${userId}:${BUDGET_KIND}:${dayKey(dayStart)}`

async function attributionTokensSpentToday(userId: string, tz: string): Promise<number> {
  const dayStart = localDay(tz, new Date())
  const row = await prisma.agentRun.findUnique({
    where: { idempotencyKey: budgetKey(userId, dayStart) },
    select: { tokenCostJson: true },
  }).catch(() => null)
  const tc = row?.tokenCostJson as { total?: unknown } | null | undefined
  const total = tc && typeof tc.total === 'number' ? tc.total : 0
  return total
}

async function recordAttributionTokens(userId: string, tokens: number, stats: AttributionRunStats): Promise<void> {
  const tz = await getUserTimezone(userId)
  const dayStart = localDay(tz, new Date())
  const key = budgetKey(userId, dayStart)
  const existing = await prisma.agentRun.findUnique({
    where: { idempotencyKey: key },
    select: { id: true, tokenCostJson: true },
  }).catch(() => null)
  const prev = (existing?.tokenCostJson as { total?: unknown } | null | undefined)
  const prevTotal = prev && typeof prev.total === 'number' ? prev.total : 0
  const total = prevTotal + tokens
  const data = {
    total,
    budget: ATTRIBUTION_DAILY_TOKEN_BUDGET,
    lastRun: { classified: stats.llmClassified, cacheReused: stats.cacheReused, tokens },
  }
  await prisma.agentRun.upsert({
    where: { idempotencyKey: key },
    create: {
      userId, kind: BUDGET_KIND, idempotencyKey: key, scheduledFor: dayStart,
      startedAt: new Date(), finishedAt: new Date(), status: 'done',
      tokenCostJson: data,
    },
    update: { tokenCostJson: data, finishedAt: new Date(), status: 'done' },
  }).catch(() => {})
}
