/**
 * src/lib/retro.ts — "Your last 30 days" retro-alignment verdict (E-2, backlog
 * §5). The activation "aha": run a BOUNDED attribution backfill over the
 * window on the existing lane (runAttribution with a wider sinceDays), then
 * read the window through the same ledger/alignment pipeline the dashboard
 * uses and distill ONE compact verdict:
 *
 *   - per-goal attention share vs stated priorities (computeAlignment)
 *   - the top-fed goal
 *   - the starving highest-priority goal (same starving-by-rank logic that
 *     drives the engine's topRedirection)
 *   - the top unaligned sink (biggest unaligned title cluster by minutes)
 *   - passive coverage % (share of tracked minutes that came from
 *     external_calendar — i.e. signal the user never had to enter by hand)
 *   - one redirection (verbatim reuse of the engine's topRedirection)
 *
 * Backfill is bounded: at most RETRO_ITEM_CAP (~1,500) items are attributed
 * per call, in the engine's existing ≤400-LLM-items-per-run batches — repeat
 * runs are incremental (each item is classified once, ever), so the first
 * call pays the backfill and subsequent calls are cheap reads.
 *
 * No schema changes: everything reads the existing alignment_attributions /
 * attention_ledger tables plus source titles for the sink cluster.
 */
import { prisma } from '@/lib/db/prisma'
import {
  runAttribution,
  computeLedger,
  computeAlignment,
  type PerGoalAlignment,
} from '@/lib/alignment-engine'
import { getUserTimezone, userLocalDayUTC } from '@/lib/user-time'

const DAY_MS = 86400000
/** Hard cap on items attributed in one retro call (backlog E-2: ~1,500). */
const RETRO_ITEM_CAP = 1500
/** Engine clamp is 400 LLM items/run — loop a few bounded runs, never more. */
const MAX_BACKFILL_RUNS = 5

export interface RetroGoalShare {
  goalId: string
  name: string
  domain: string
  rank: number
  sharePct: number // 0..100
  expectedSharePct: number // 0..100
  minutes: number
  actions: number
  mentions: number
  momentum: 'fed' | 'flat' | 'starving'
}

export interface RetroVerdict {
  asOf: string
  windowDays: number
  hasData: boolean
  headline: string
  perGoal: RetroGoalShare[]
  unalignedSharePct: number
  topFed: { goalId: string; name: string; sharePct: number } | null
  starvingPriority: {
    goalId: string
    name: string
    rank: number
    sharePct: number
    expectedSharePct: number
  } | null
  topUnalignedSink: {
    title: string
    minutes: number
    occurrences: number
    sharePct: number // of all tracked minutes in the window
  } | null
  passiveCoveragePct: number // external_calendar minutes / all tracked minutes
  redirection: string
  totals: { trackedMinutes: number; passiveMinutes: number; attributedItems: number }
  backfill: { runs: number; processed: number; deferred: number; errors: string[] }
}

const pct100 = (n: number) => Math.round(n * 100)

export async function computeRetro(
  userId: string,
  opts: { days?: number } = {},
): Promise<RetroVerdict> {
  const days = Math.min(Math.max(opts.days ?? 30, 7), 60)

  // ── 1. Bounded backfill on the existing attribution lane ──────────────────
  // Each run is incremental (UNIQUE sourceType+sourceId) and classifies at
  // most 400 LLM items; loop until nothing is deferred or the retro cap hits.
  const backfill = { runs: 0, processed: 0, deferred: 0, errors: [] as string[] }
  for (let i = 0; i < MAX_BACKFILL_RUNS; i++) {
    const budget = RETRO_ITEM_CAP - backfill.processed
    if (budget <= 0) break
    const stats = await runAttribution(userId, {
      sinceDays: days,
      maxLlmItems: Math.min(400, budget),
    })
    backfill.runs += 1
    backfill.processed += stats.groundTruth + stats.llmClassified + stats.llmUnclassified
    backfill.deferred = stats.llmDeferred
    if (stats.errors.length > 0) {
      // Provider trouble — serve the verdict from what IS attributed; the
      // remainder retries on the next call.
      backfill.errors.push(...stats.errors.slice(0, 3))
      break
    }
    if (stats.scanned === 0 || stats.llmDeferred === 0) break
  }

  // ── 2. Windowed ledger + alignment (the same math the dashboard trusts) ──
  await computeLedger(userId, { days })
  const alignment = await computeAlignment(userId, { days })
  const weekly = alignment.weekly

  const perGoal: RetroGoalShare[] = weekly.perGoal.map((g: PerGoalAlignment) => ({
    goalId: g.goalId,
    name: g.name,
    domain: g.domain,
    rank: g.rank,
    sharePct: pct100(g.share),
    expectedSharePct: pct100(g.expectedShare),
    minutes: g.minutes,
    actions: g.actions,
    mentions: g.mentions,
    momentum: g.momentum,
  }))

  // ── 3. Window attributions: totals, passive coverage, unaligned sink ─────
  const tz = await getUserTimezone(userId)
  const since = new Date(userLocalDayUTC(tz, new Date()).getTime() - days * DAY_MS)
  const atts = await prisma.alignmentAttribution.findMany({
    where: { userId, sourceDate: { gte: since } },
    select: { sourceType: true, sourceId: true, goalId: true, weight: true, minutes: true },
    take: 5000,
  })

  let trackedMinutes = 0
  let passiveMinutes = 0
  for (const a of atts) {
    trackedMinutes += a.minutes
    if (a.sourceType === 'external_calendar') passiveMinutes += a.minutes
  }
  const hasData = atts.length > 0 && perGoal.length > 0

  // Unaligned sink: cluster the unaligned minute-bearing items by normalized
  // title (same aligned/unaligned rule as computeLedger: only direct/
  // supporting WITH a goal feed a goal; unrelated + counter land unaligned).
  const unalignedCal = atts.filter(
    (a) =>
      a.minutes > 0 &&
      (a.sourceType === 'calendar' || a.sourceType === 'external_calendar') &&
      !((a.weight === 'direct' || a.weight === 'supporting') && a.goalId),
  )
  const calIds = unalignedCal.filter((a) => a.sourceType === 'calendar').map((a) => a.sourceId)
  const extIds = unalignedCal.filter((a) => a.sourceType === 'external_calendar').map((a) => a.sourceId)
  const [calRows, extRows] = await Promise.all([
    calIds.length
      ? prisma.calendarEvent.findMany({ where: { id: { in: calIds }, userId }, select: { id: true, title: true } })
      : Promise.resolve([] as Array<{ id: string; title: string | null }>),
    extIds.length
      ? prisma.externalEvent.findMany({ where: { id: { in: extIds }, userId }, select: { id: true, title: true } })
      : Promise.resolve([] as Array<{ id: string; title: string | null }>),
  ])
  const titleOf = new Map<string, string>()
  for (const r of calRows) titleOf.set(r.id, r.title ?? '')
  for (const r of extRows) titleOf.set(r.id, r.title ?? '')

  const clusters = new Map<string, { title: string; minutes: number; occurrences: number }>()
  for (const a of unalignedCal) {
    const raw = (titleOf.get(a.sourceId) ?? '').trim()
    if (!raw) continue
    const key = raw.toLowerCase()
    const c = clusters.get(key) ?? { title: raw, minutes: 0, occurrences: 0 }
    c.minutes += a.minutes
    c.occurrences += 1
    clusters.set(key, c)
  }
  const topCluster = Array.from(clusters.values()).sort(
    (a, b) => b.minutes - a.minutes || b.occurrences - a.occurrences,
  )[0]
  const topUnalignedSink = topCluster
    ? {
        title: topCluster.title,
        minutes: topCluster.minutes,
        occurrences: topCluster.occurrences,
        sharePct: trackedMinutes > 0 ? Math.round((topCluster.minutes / trackedMinutes) * 100) : 0,
      }
    : null

  // ── 4. Verdict pieces ─────────────────────────────────────────────────────
  const fedSorted = [...perGoal].sort((a, b) => b.sharePct - a.sharePct)
  const topFed =
    hasData && fedSorted[0] && fedSorted[0].sharePct > 0
      ? { goalId: fedSorted[0].goalId, name: fedSorted[0].name, sharePct: fedSorted[0].sharePct }
      : null

  // Same selection the engine's redirection uses: highest-priority starving
  // goal (rank ascending). This IS "the starving #1-priority goal".
  const starving = hasData
    ? [...perGoal].filter((g) => g.momentum === 'starving').sort((a, b) => a.rank - b.rank)[0] ?? null
    : null
  const starvingPriority = starving
    ? {
        goalId: starving.goalId,
        name: starving.name,
        rank: starving.rank,
        sharePct: starving.sharePct,
        expectedSharePct: starving.expectedSharePct,
      }
    : null

  const passiveCoveragePct = trackedMinutes > 0 ? Math.round((passiveMinutes / trackedMinutes) * 100) : 0

  return {
    asOf: new Date().toISOString(),
    windowDays: days,
    hasData,
    headline: weekly.headline,
    perGoal,
    unalignedSharePct: pct100(weekly.unalignedShare),
    topFed,
    starvingPriority,
    topUnalignedSink,
    passiveCoveragePct,
    redirection: weekly.topRedirection, // reuse the engine's redirection verbatim
    totals: { trackedMinutes, passiveMinutes, attributedItems: atts.length },
    backfill,
  }
}

/**
 * Cheap existence check (no LLM, no backfill): does this user have ANY
 * attributable signal in the last `days` days? Used by the onboarding
 * completion pointer — it must never block or slow onboarding.
 */
export async function hasAttributableData(userId: string, days = 30): Promise<boolean> {
  const since = new Date(Date.now() - days * DAY_MS)
  const [ext, doneTasks, events] = await Promise.all([
    prisma.externalEvent.count({ where: { userId, isDeleted: false, startsAt: { gte: since } } }),
    prisma.oSTask.count({ where: { userId, completedAt: { gte: since } } }),
    prisma.calendarEvent.count({ where: { userId, startAt: { gte: since } } }),
  ])
  return ext + doneTasks + events > 0
}
