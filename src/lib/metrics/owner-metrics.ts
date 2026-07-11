/**
 * src/lib/metrics/owner-metrics.ts — the §4.4 "dashboard of record" metrics,
 * computed from the DB wherever possible (daily_user_stats + source tables).
 *
 * Metrics that CANNOT come from the DB (raw client-funnel event counts for the
 * pre-DB steps: reveal_viewed, onboarding_birth/quiz/archetype_viewed) are
 * flagged `posthogSourced: true` so the owner view can label them — everything
 * else is real, live DB math. No hardcoded numbers.
 */
import { prisma } from '@/lib/db/prisma'

export interface OwnerMetrics {
  windowDays: number
  wauAligned: number
  totalUsers: number
  rar: { accepted: number; decided: number; rate: number | null }
  passiveCoverage: { passive: number; tracked: number; rate: number | null }
  correction: { overrides: number; total: number; rate: number | null }
  ritualsByCadence: Array<{ kind: string; done: number; total: number; rate: number | null }>
  telegramLinkedPct: { linked: number; total: number; rate: number | null }
  funnel: Array<{ step: string; count: number | null; posthogSourced: boolean }>
}

const RITUAL_KINDS = ['daily_brief', 'daily_shutdown', 'weekly', 'monthly', 'quarterly', 'annual']

export async function computeOwnerMetrics(windowDays = 7): Promise<OwnerMetrics> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const sinceDate = since.toISOString().slice(0, 10)

  // ── Total (non-deleted) users ──
  const totalUsers = await prisma.user.count({ where: { dataDeletedAt: null } }).catch(() => 0)

  // ── WAU-aligned: distinct users with aligned activity in the window ──
  const wauRows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    `SELECT COUNT(DISTINCT user_id)::int AS n
       FROM daily_user_stats
      WHERE local_date >= $1::date AND aligned_share > 0`,
    sinceDate,
  ).catch(() => [] as Array<{ n: number }>)
  const wauAligned = Number(wauRows[0]?.n ?? 0) || 0

  // ── RAR: redirection acceptance rate (accepted / decided) ──
  const rarRows = await prisma.$queryRawUnsafe<Array<{ accepted: number; decided: number }>>(
    `SELECT COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
            COUNT(*) FILTER (WHERE status IN ('accepted','declined'))::int AS decided
       FROM redirection_proposals
      WHERE created_at >= $1`,
    since,
  ).catch(() => [] as Array<{ accepted: number; decided: number }>)
  const rAccepted = Number(rarRows[0]?.accepted ?? 0) || 0
  const rDecided = Number(rarRows[0]?.decided ?? 0) || 0

  // ── Passive Coverage: passive / tracked minutes over the window ──
  const pcRows = await prisma.$queryRawUnsafe<Array<{ passive: number; tracked: number }>>(
    `SELECT COALESCE(SUM(passive_minutes),0)::int AS passive,
            COALESCE(SUM(tracked_minutes),0)::int AS tracked
       FROM daily_user_stats
      WHERE local_date >= $1::date`,
    sinceDate,
  ).catch(() => [] as Array<{ passive: number; tracked: number }>)
  const passive = Number(pcRows[0]?.passive ?? 0) || 0
  const tracked = Number(pcRows[0]?.tracked ?? 0) || 0

  // ── Attribution correction rate: user_override share of attributions ──
  // alignment_attributions is mixed-case: "createdAt" is camelCase, user_override
  // is snake_case (added by the E-8 migration).
  const corrRows = await prisma.$queryRawUnsafe<Array<{ overrides: number; total: number }>>(
    `SELECT COUNT(*) FILTER (WHERE user_override = true)::int AS overrides,
            COUNT(*)::int AS total
       FROM alignment_attributions
      WHERE "createdAt" >= $1`,
    since,
  ).catch(() => [] as Array<{ overrides: number; total: number }>)
  const overrides = Number(corrRows[0]?.overrides ?? 0) || 0
  const attrTotal = Number(corrRows[0]?.total ?? 0) || 0

  // ── Ritual completion by cadence (agent_runs) ──
  const ritualRows = await prisma.$queryRawUnsafe<Array<{ kind: string; done: number; total: number }>>(
    `SELECT kind,
            COUNT(*) FILTER (WHERE status = 'done')::int AS done,
            COUNT(*)::int AS total
       FROM agent_runs
      WHERE scheduled_for >= $1 AND kind = ANY($2::text[])
      GROUP BY kind`,
    since, RITUAL_KINDS,
  ).catch(() => [] as Array<{ kind: string; done: number; total: number }>)
  const byKind = new Map(ritualRows.map((r) => [r.kind, r]))
  const ritualsByCadence = RITUAL_KINDS.map((kind) => {
    const r = byKind.get(kind)
    const done = Number(r?.done ?? 0) || 0
    const total = Number(r?.total ?? 0) || 0
    return { kind, done, total, rate: total > 0 ? done / total : null }
  })

  // ── Telegram-linked % ──
  const tgRows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    `SELECT COUNT(DISTINCT "userId")::int AS n FROM oauth_accounts WHERE provider = 'telegram'`,
  ).catch(() => [] as Array<{ n: number }>)
  const tgLinked = Number(tgRows[0]?.n ?? 0) || 0

  // ── Funnel conversion by step ──
  // DB-derivable terminal steps: signup≈users, goals_set≈users with ≥1 goal,
  // subscribed≈active subscriptions. Early client-only steps are PostHog-sourced.
  const usersWithGoals = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    `SELECT COUNT(DISTINCT "userId")::int AS n FROM goals`,
  ).catch(() => [] as Array<{ n: number }>)
  const subscribed = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    `SELECT COUNT(*)::int AS n FROM subscriptions WHERE status = 'active'`,
  ).catch(() => [] as Array<{ n: number }>)

  const funnel: OwnerMetrics['funnel'] = [
    { step: 'reveal_viewed', count: null, posthogSourced: true },
    { step: 'signup', count: totalUsers, posthogSourced: false },
    { step: 'onboarding_birth', count: null, posthogSourced: true },
    { step: 'onboarding_quiz', count: null, posthogSourced: true },
    { step: 'onboarding_archetype_viewed', count: null, posthogSourced: true },
    { step: 'onboarding_goals_set', count: Number(usersWithGoals[0]?.n ?? 0) || 0, posthogSourced: false },
    { step: 'subscribed', count: Number(subscribed[0]?.n ?? 0) || 0, posthogSourced: false },
  ]

  return {
    windowDays,
    wauAligned,
    totalUsers,
    rar: { accepted: rAccepted, decided: rDecided, rate: rDecided > 0 ? rAccepted / rDecided : null },
    passiveCoverage: { passive, tracked, rate: tracked > 0 ? passive / tracked : null },
    correction: { overrides, total: attrTotal, rate: attrTotal > 0 ? overrides / attrTotal : null },
    ritualsByCadence,
    telegramLinkedPct: { linked: tgLinked, total: totalUsers, rate: totalUsers > 0 ? tgLinked / totalUsers : null },
    funnel,
  }
}
