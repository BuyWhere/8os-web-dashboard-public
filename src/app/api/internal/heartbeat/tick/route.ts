/**
 * POST /api/internal/heartbeat/tick — the hourly heartbeat (E-3, backlog §3.4).
 *
 * AUTH (machine-to-machine, no Clerk): HMAC-SHA256 over the X-8OS-TIMESTAMP
 * header value keyed by HEARTBEAT_SECRET, hex, in X-8OS-INTERNAL-SIGNATURE.
 * Rejects (401) when either header is missing, the signature mismatches, or the
 * timestamp skew exceeds 5 minutes. Constant-time compare.
 *
 * WORK (per tick):
 *   1. For every user whose LOCAL hour == their configured brief hour (default
 *      7, from the 07:30 default) or shutdown hour (default 21) AND who has no
 *      agent_runs row for idempotency key `{userId}:{kind}:{localDate}`, create
 *      a queued run and execute the matching playbook. Concurrency cap 5.
 *   2. Best-effort external-signal poll: any active external_signal_sources not
 *      synced in 45+ minutes get a syncSource() call (fulfils E-1's poller note).
 *
 * Idempotent: re-running the same tick within the same local hour/day is a
 * no-op (the unique idempotency key already exists).
 *
 * Node runtime (crypto + prisma + Flow AI). Never on the edge.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { DEFAULT_TIMEZONE, isValidTimezone, userLocalDate } from '@/lib/user-time'
import { runDailyBrief } from '@/lib/playbooks/daily-brief'
import { runDailyShutdown } from '@/lib/playbooks/daily-shutdown'
import { runWeekly } from '@/lib/playbooks/weekly'
import { runMonthly } from '@/lib/playbooks/monthly'
import { runQuarterly } from '@/lib/playbooks/quarterly'
import { runAnnual } from '@/lib/playbooks/annual'
import {
  isoWeekKey, onLiuYueBoundary, onQuarterBoundary, onLiChunBoundary,
} from '@/lib/playbooks/rhythm-shared'
import { consolidateUser } from '@/lib/memory/extract'
import { syncSource } from '@/lib/external/google-calendar'
import { runDailyRollup } from '@/lib/rollup/daily-user-stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SKEW_MS = 5 * 60 * 1000
const CONCURRENCY = 5
const DEFAULT_BRIEF_HOUR = 7 // 07:30 default
const DEFAULT_SHUTDOWN_HOUR = 21 // 21:30 default
const CONSOLIDATION_HOUR = 3 // 3am local — low-traffic nightly memory consolidation (E-5/E-6)
const ROLLUP_HOUR = 2 // 2am local — §4.4 daily_user_stats rollup of the day that just closed
// Phase-E rhythm boundaries (all evaluated in the user's LOCAL time):
//   weekly    → Sun evening (default local hour 18), key {userId}:weekly:{isoWeek}
//   monthly   → the local day the 流月 solar-month turns over, key {userId}:monthly:{yyyymm}
//   quarterly → the local day a 12-week cycle boundary lands, key {userId}:quarterly:{cycleIndex}
//   annual    → the Lì Chūn local day (± user offset), key {userId}:annual:{baziYear}
// Monthly/quarterly/annual fire once on their boundary DAY (any local hour they
// are first seen that day); weekly fires at a set evening hour on Sunday.
const DEFAULT_WEEKLY_HOUR = 18 // Sun evening default (user-overridable via prefs.weekly.hour)
const DEFAULT_WEEKLY_DOW = 0 // Sunday (local)
const RHYTHM_FIRE_HOUR = 9 // monthly/quarterly/annual fire at 9am local on their boundary day
const STALE_SYNC_MS = 45 * 60 * 1000

function verifySignature(req: NextRequest): { ok: boolean; reason?: string } {
  const secret = process.env.HEARTBEAT_SECRET
  if (!secret) return { ok: false, reason: 'HEARTBEAT_SECRET unset' }
  const ts = req.headers.get('x-8os-timestamp')
  const sig = req.headers.get('x-8os-internal-signature')
  if (!ts || !sig) return { ok: false, reason: 'missing headers' }

  const tsMs = Number(ts)
  if (!Number.isFinite(tsMs)) return { ok: false, reason: 'bad timestamp' }
  if (Math.abs(Date.now() - tsMs) > SKEW_MS) return { ok: false, reason: 'skew' }

  const expected = createHmac('sha256', secret).update(ts).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(sig, 'utf8')
  if (a.length !== b.length) return { ok: false, reason: 'signature mismatch' }
  if (!timingSafeEqual(a, b)) return { ok: false, reason: 'signature mismatch' }
  return { ok: true }
}

/** The user's current local hour (0–23) in their timezone. */
function localHour(tz: string, at: Date): number {
  const zone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', hour12: false }).format(at)
  return Number(h) % 24
}

/** The user's current local day-of-week (0 = Sunday) in their timezone. */
function localDow(tz: string, at: Date): number {
  const zone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short' }).format(at)
  return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[wd] ?? 0
}

/** The user's current local yyyymm (for the monthly idempotency key). */
function localYyyymm(tz: string, at: Date): string {
  const zone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit' }).format(at).replace('-', '')
}

interface PrefRow {
  userId: string
  prefsJson: Record<string, { enabled?: boolean; hour?: number }> | null
}

/** Run a list of async tasks with a fixed concurrency cap. */
async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let i = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      await worker(items[idx]).catch((e) => console.error('[heartbeat] worker error:', e))
    }
  })
  await Promise.all(runners)
}

export async function POST(req: NextRequest) {
  const auth = verifySignature(req)
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized', reason: auth.reason }, { status: 401 })
  }

  const now = new Date()

  // ── 1. Select due playbook runs ───────────────────────────────────────────
  // Candidates = users with a profile (timezone) OR a prefs row. We only need
  // users who have completed onboarding (a profile) to have a real "today".
  const profiles = await prisma.userProfile.findMany({
    select: { userId: true, timezone: true },
    take: 5000,
  })
  const prefsRows = await prisma.notificationPrefs.findMany({
    select: { userId: true, prefsJson: true },
    take: 5000,
  })
  const prefsByUser = new Map<string, PrefRow>(
    prefsRows.map((r) => [r.userId, { userId: r.userId, prefsJson: (r.prefsJson as PrefRow['prefsJson']) ?? null }]),
  )

  type RunKind =
    | 'daily_brief' | 'daily_shutdown' | 'nightly_consolidation' | 'daily_rollup'
    | 'weekly' | 'monthly' | 'quarterly' | 'annual'
  interface Due { userId: string; kind: RunKind; localDate: string; idem: string }
  const due: Due[] = []
  for (const p of profiles) {
    const tz = isValidTimezone(p.timezone) ? (p.timezone as string) : DEFAULT_TIMEZONE
    const hour = localHour(tz, now)
    const localDate = userLocalDate(tz, now).iso
    const pref = prefsByUser.get(p.userId)?.prefsJson ?? null

    const briefPref = pref?.daily_brief
    const shutdownPref = pref?.daily_shutdown
    const briefHour = typeof briefPref?.hour === 'number' ? briefPref.hour : DEFAULT_BRIEF_HOUR
    const shutdownHour = typeof shutdownPref?.hour === 'number' ? shutdownPref.hour : DEFAULT_SHUTDOWN_HOUR
    const briefEnabled = briefPref?.enabled !== false
    const shutdownEnabled = shutdownPref?.enabled !== false

    if (briefEnabled && hour === briefHour) {
      due.push({ userId: p.userId, kind: 'daily_brief', localDate, idem: `${p.userId}:daily_brief:${localDate}` })
    }
    if (shutdownEnabled && hour === shutdownHour) {
      due.push({ userId: p.userId, kind: 'daily_shutdown', localDate, idem: `${p.userId}:daily_shutdown:${localDate}` })
    }
    // Nightly memory/commitment consolidation (E-5/E-6) — once per user per
    // local day at 3am local. Not user-configurable and not a proactive message,
    // so it ignores the notification prefs; idempotency is the agent_runs key.
    if (hour === CONSOLIDATION_HOUR) {
      due.push({ userId: p.userId, kind: 'nightly_consolidation', localDate, idem: `${p.userId}:nightly_consolidation:${localDate}` })
    }
    // §4.4 daily_user_stats rollup — once per user per local day at ROLLUP_HOUR
    // local. Not a proactive message (ignores notification prefs); idempotency is
    // the agent_runs key. Rolls up the local day that just CLOSED.
    if (hour === ROLLUP_HOUR) {
      due.push({ userId: p.userId, kind: 'daily_rollup', localDate, idem: `${p.userId}:daily_rollup:${localDate}` })
    }

    // ── Phase-E RHYTHM cadences (weekly/monthly/quarterly/annual) ────────────
    // Each fires on its REAL boundary in the user's LOCAL time; idempotency keys
    // are period-scoped (isoWeek / yyyymm / cycleIndex / baziYear) so a run fires
    // at most once per period regardless of how many ticks land in the window.

    // WEEKLY — Sunday evening (user-overridable hour), keyed by ISO week.
    const weeklyPref = pref?.weekly
    const weeklyEnabled = (weeklyPref as { enabled?: boolean } | undefined)?.enabled !== false
    const weeklyHour = typeof (weeklyPref as { hour?: number } | undefined)?.hour === 'number'
      ? (weeklyPref as { hour: number }).hour : DEFAULT_WEEKLY_HOUR
    const weeklyDow = typeof (weeklyPref as { dow?: number } | undefined)?.dow === 'number'
      ? (weeklyPref as { dow: number }).dow : DEFAULT_WEEKLY_DOW
    if (weeklyEnabled && localDow(tz, now) === weeklyDow && hour === weeklyHour) {
      due.push({ userId: p.userId, kind: 'weekly', localDate, idem: `${p.userId}:weekly:${isoWeekKey(tz, now)}` })
    }

    // MONTHLY — the local day the 流月 solar month turns over (from bazi-phases),
    // fired at RHYTHM_FIRE_HOUR that day, keyed by local yyyymm.
    const monthlyEnabled = (pref?.monthly as { enabled?: boolean } | undefined)?.enabled !== false
    if (monthlyEnabled && hour === RHYTHM_FIRE_HOUR && onLiuYueBoundary(tz, now).on) {
      due.push({ userId: p.userId, kind: 'monthly', localDate, idem: `${p.userId}:monthly:${localYyyymm(tz, now)}` })
    }

    // QUARTERLY — the local day a 12-week cycle boundary lands (Monday-anchored),
    // fired at RHYTHM_FIRE_HOUR, keyed by cycle index.
    const quarterlyEnabled = (pref?.quarterly as { enabled?: boolean } | undefined)?.enabled !== false
    const qb = onQuarterBoundary(tz, now)
    if (quarterlyEnabled && hour === RHYTHM_FIRE_HOUR && qb.on) {
      due.push({ userId: p.userId, kind: 'quarterly', localDate, idem: `${p.userId}:quarterly:${qb.cycleIndex}` })
    }

    // ANNUAL — the Lì Chūn local day ± the user's chosen offset (LNY window),
    // fired at RHYTHM_FIRE_HOUR, keyed by BaZi year.
    const annualPref = pref?.annual as { enabled?: boolean; offsetDays?: number } | undefined
    const annualEnabled = annualPref?.enabled !== false
    const annualOffset = typeof annualPref?.offsetDays === 'number' ? annualPref.offsetDays : 0
    const ab = onLiChunBoundary(tz, now, annualOffset)
    if (annualEnabled && hour === RHYTHM_FIRE_HOUR && ab.on) {
      due.push({ userId: p.userId, kind: 'annual', localDate, idem: `${p.userId}:annual:${ab.baziYear}` })
    }
  }

  // Filter out runs whose idempotency key already exists.
  const existing = due.length
    ? await prisma.agentRun.findMany({
        where: { idempotencyKey: { in: due.map((d) => d.idem) } },
        select: { idempotencyKey: true },
      })
    : []
  const existingKeys = new Set(existing.map((e) => e.idempotencyKey))
  const toRun = due.filter((d) => !existingKeys.has(d.idem))

  const results: Array<{ userId: string; kind: string; status: string; reason?: string }> = []

  await runPool(toRun, CONCURRENCY, async (d) => {
    // Claim the run atomically via the UNIQUE idempotency key — a concurrent
    // tick that lost the race gets a P2002 and skips (no duplicate message).
    let runId: string
    try {
      const run = await prisma.agentRun.create({
        data: {
          userId: d.userId,
          kind: d.kind,
          idempotencyKey: d.idem,
          scheduledFor: now,
          startedAt: new Date(),
          status: 'running',
        },
        select: { id: true },
      })
      runId = run.id
    } catch (e) {
      // Unique violation = another worker/tick already claimed it.
      results.push({ userId: d.userId, kind: d.kind, status: 'duplicate' })
      return
    }

    // nightly_consolidation is not a proactive message (no governor); it runs
    // the E-5/E-6 distillation and records the merge stats as its output.
    if (d.kind === 'nightly_consolidation') {
      const cr = await consolidateUser(d.userId, { at: now }).catch((e) => {
        console.error('[heartbeat] consolidateUser threw:', e)
        return null
      })
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: cr && cr.ok ? 'done' : 'failed',
          finishedAt: new Date(),
          outputJson: cr ? (cr as object) : { reason: 'consolidation error' },
        },
      }).catch((e) => console.error('[heartbeat] consolidation finalize failed:', e))
      results.push({ userId: d.userId, kind: d.kind, status: cr && cr.ok ? 'done' : 'failed' })
      return
    }

    // §4.4 daily_rollup — not a proactive message; aggregates the just-closed
    // local day into daily_user_stats (idempotent UPSERT). Records the rolled
    // stats as the run output.
    if (d.kind === 'daily_rollup') {
      const rr = await runDailyRollup(d.userId, { at: now }).catch((e) => {
        console.error('[heartbeat] runDailyRollup threw:', e)
        return null
      })
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: rr && rr.ok ? 'done' : 'failed',
          finishedAt: new Date(),
          outputJson: rr ? (rr as object) : { reason: 'rollup error' },
        },
      }).catch((e) => console.error('[heartbeat] rollup finalize failed:', e))
      results.push({ userId: d.userId, kind: d.kind, status: rr && rr.ok ? 'done' : 'failed' })
      return
    }

    // Dispatch to the matching playbook. Daily brief/shutdown return
    // PlaybookRunResult; the Phase-E rhythm playbooks return RhythmRunResult
    // (which additionally carries an `output` audit blob). Both share the
    // status/inboxMessageId/usedLlm/tokenCost surface the finalize step uses.
    const res =
      d.kind === 'daily_brief' ? await runDailyBrief(d.userId, { runId, at: now })
      : d.kind === 'daily_shutdown' ? await runDailyShutdown(d.userId, { runId, at: now })
      : d.kind === 'weekly' ? await runWeekly(d.userId, { runId, at: now })
      : d.kind === 'monthly' ? await runMonthly(d.userId, { runId, at: now })
      : d.kind === 'quarterly' ? await runQuarterly(d.userId, { runId, at: now })
      : await runAnnual(d.userId, { runId, at: now })

    // Rich rhythm output when present, else the daily {inboxMessageId,usedLlm}.
    const richOutput = (res as { output?: Record<string, unknown> }).output
      ?? { inboxMessageId: res.inboxMessageId ?? null, usedLlm: res.usedLlm ?? false }

    // The governor already marks the run 'skipped' when it suppresses; only the
    // done/failed terminal states need writing here (skip if already skipped).
    if (res.status === 'done') {
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: 'done',
          finishedAt: new Date(),
          outputJson: richOutput as object,
          tokenCostJson: res.tokenCost ? (res.tokenCost as object) : undefined,
        },
      }).catch((e) => console.error('[heartbeat] run finalize failed:', e))
    } else if (res.status === 'failed') {
      await prisma.agentRun.update({
        where: { id: runId },
        data: { status: 'failed', finishedAt: new Date(), outputJson: { reason: res.reason ?? 'unknown' } },
      }).catch((e) => console.error('[heartbeat] run fail-mark failed:', e))
    }
    // status === 'skipped' → governor already wrote it.

    results.push({ userId: d.userId, kind: d.kind, status: res.status, reason: res.reason })
  })

  // ── 2. External-signal poller piggyback (E-1) ─────────────────────────────
  let synced = 0
  try {
    const stale = await prisma.externalSignalSource.findMany({
      where: {
        status: 'active',
        OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(now.getTime() - STALE_SYNC_MS) } }],
      },
      select: { id: true },
      take: 200,
    })
    await runPool(stale, CONCURRENCY, async (s) => {
      const r = await syncSource(s.id).catch((e) => {
        console.error('[heartbeat] syncSource failed:', e)
        return null
      })
      if (r && r.status === 'synced') synced++
    })
  } catch (e) {
    console.error('[heartbeat] external poll failed:', e)
  }

  return NextResponse.json({
    ok: true,
    at: now.toISOString(),
    candidates: due.length,
    ran: toRun.length,
    results,
    sourcesSynced: synced,
  })
}
