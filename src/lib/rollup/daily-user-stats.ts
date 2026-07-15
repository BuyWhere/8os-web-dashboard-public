/**
 * src/lib/rollup/daily-user-stats.ts — §4.4 nightly rollup.
 *
 * Aggregates one user's activity for a single LOCAL day into a `daily_user_stats`
 * row, UPSERTed on (user_id, local_date) so re-running the same rollup is a no-op
 * (idempotent — the heartbeat may retry, and a manual QA run must not double it).
 *
 * Sources (per the backlog §4.4 definitions):
 *   - tracked_minutes / aligned_share : attention_ledger (goalId=NULL is the
 *     unaligned bucket; everything else is aligned).
 *   - passive_minutes                 : external_events durations (the passive
 *     calendar signal, E-1) that fall in the local day.
 *   - rituals_completed               : agent_runs with a ritual kind whose
 *     status='done' that local day (by scheduled_for).
 *   - proactive_sent / opened         : inbox_messages created that local day,
 *     and how many are read.
 *
 * Runs at each user's local midnight from the heartbeat tick (`daily_rollup`
 * run kind). Called with `at` = the tick instant; it rolls up the LOCAL day that
 * just CLOSED (i.e. "yesterday" relative to a local-midnight tick), so a full
 * day's data is available. QA can pass an explicit `at` to target any day.
 *
 * Relation-free raw SQL against the drifted prod DB (never prisma migrate).
 * Node runtime.
 */
import { prisma } from '@/lib/db/prisma'
import { DEFAULT_TIMEZONE, isValidTimezone, getUserTimezone, userDayBounds } from '@/lib/user-time'

// Which agent_runs kinds count as a completed "ritual" for the day.
const RITUAL_KINDS = ['daily_brief', 'daily_shutdown', 'weekly', 'monthly', 'quarterly', 'annual']

export interface RollupResult {
  ok: boolean
  userId: string
  localDate: string
  trackedMinutes: number
  passiveMinutes: number
  alignedShare: number
  ritualsCompleted: number
  proactiveSent: number
  proactiveOpened: number
  reason?: string
}

/**
 * Roll up a single user's stats for the local day that CLOSED at `atOrTz`'s
 * local midnight. If `opts.targetDate` (YYYY-MM-DD) is given, rolls up exactly
 * that local day instead (used by QA to target a seeded day precisely).
 */
export async function runDailyRollup(
  userId: string,
  opts: { at?: Date; tz?: string; targetDate?: string } = {},
): Promise<RollupResult> {
  const at = opts.at ?? new Date()
  const tz = opts.tz && isValidTimezone(opts.tz)
    ? opts.tz
    : await getUserTimezone(userId).catch(() => DEFAULT_TIMEZONE)

  // Resolve the local day to roll up.
  let bounds: { start: Date; end: Date; localDate: string }
  if (opts.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(opts.targetDate)) {
    // Midday of the target local date → unambiguous day bucket regardless of tz.
    const anchor = new Date(`${opts.targetDate}T12:00:00.000Z`)
    bounds = userDayBounds(tz, anchor)
  } else {
    // The local day that just closed: 1ms before this local midnight tick.
    bounds = userDayBounds(tz, new Date(at.getTime() - 1))
  }
  const { start, end, localDate } = bounds
  const localDateObj = new Date(`${localDate}T00:00:00.000Z`)

  try {
    // ── tracked / aligned minutes from attention_ledger (day = local date) ──
    // NB: attention_ledger uses camelCase columns ("userId","goalId","day") — no
    // @map on that model — unlike the snake_case E-1/E-3/E-7 tables. Quote them.
    const ledger = await prisma.$queryRawUnsafe<Array<{ goalId: string | null; minutes: number }>>(
      `SELECT "goalId", COALESCE(SUM(minutes), 0)::int AS minutes
         FROM attention_ledger
        WHERE "userId" = $1 AND "day" = $2::date
        GROUP BY "goalId"`,
      userId, localDate,
    ).catch(() => [] as Array<{ goalId: string | null; minutes: number }>)

    let trackedMinutes = 0
    let alignedMinutes = 0
    for (const r of ledger) {
      const m = Number(r.minutes) || 0
      trackedMinutes += m
      if (r.goalId !== null) alignedMinutes += m
    }
    const alignedShare = trackedMinutes > 0 ? alignedMinutes / trackedMinutes : 0

    // ── passive minutes from external_events overlapping the local day ──
    const passiveRows = await prisma.$queryRawUnsafe<Array<{ minutes: number }>>(
      `SELECT COALESCE(SUM(
                LEAST(960, GREATEST(0, EXTRACT(EPOCH FROM (ends_at - starts_at)) / 60))
              ), 0)::int AS minutes
         FROM external_events
        WHERE user_id = $1
          AND is_deleted = false
          AND starts_at >= $2 AND starts_at <= $3`,
      userId, start, end,
    ).catch(() => [] as Array<{ minutes: number }>)
    const passiveMinutes = Number(passiveRows[0]?.minutes ?? 0) || 0

    // ── rituals completed (agent_runs done that local day) ──
    const ritualRows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT COUNT(*)::int AS n
         FROM agent_runs
        WHERE user_id = $1
          AND status = 'done'
          AND kind = ANY($2::text[])
          AND scheduled_for >= $3 AND scheduled_for <= $4`,
      userId, RITUAL_KINDS, start, end,
    ).catch(() => [] as Array<{ n: number }>)
    const ritualsCompleted = Number(ritualRows[0]?.n ?? 0) || 0

    // ── proactive messages sent / opened (inbox_messages that local day) ──
    const proactiveRows = await prisma.$queryRawUnsafe<Array<{ sent: number; opened: number }>>(
      `SELECT COUNT(*)::int AS sent,
              COUNT(*) FILTER (WHERE read = true)::int AS opened
         FROM inbox_messages
        WHERE user_id = $1
          AND created_at >= $2 AND created_at <= $3`,
      userId, start, end,
    ).catch(() => [] as Array<{ sent: number; opened: number }>)
    const proactiveSent = Number(proactiveRows[0]?.sent ?? 0) || 0
    const proactiveOpened = Number(proactiveRows[0]?.opened ?? 0) || 0

    // ── idempotent UPSERT ──
    await prisma.dailyUserStats.upsert({
      where: { userId_localDate: { userId, localDate: localDateObj } },
      create: {
        userId,
        localDate: localDateObj,
        trackedMinutes,
        passiveMinutes,
        alignedShare,
        ritualsCompleted,
        proactiveSent,
        proactiveOpened,
      },
      update: {
        trackedMinutes,
        passiveMinutes,
        alignedShare,
        ritualsCompleted,
        proactiveSent,
        proactiveOpened,
        updatedAt: new Date(),
      },
    })

    return {
      ok: true,
      userId,
      localDate,
      trackedMinutes,
      passiveMinutes,
      alignedShare,
      ritualsCompleted,
      proactiveSent,
      proactiveOpened,
    }
  } catch (e) {
    console.error('[daily-rollup] failed for', userId, e)
    return {
      ok: false, userId, localDate,
      trackedMinutes: 0, passiveMinutes: 0, alignedShare: 0,
      ritualsCompleted: 0, proactiveSent: 0, proactiveOpened: 0,
      reason: e instanceof Error ? e.message : 'error',
    }
  }
}
