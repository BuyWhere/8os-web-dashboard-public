/**
 * POST /api/rollup/dev-run — QA-only trigger for the §4.4 daily_user_stats
 * rollup (qa/owner-metrics-probe.js). Lets QA seed a day's attention_ledger /
 * inbox_messages / agent_runs (additive INSERTs — NEVER deletes) and then run
 * the rollup for a target local date, so daily_user_stats populates end-to-end
 * without waiting for the user's local-midnight heartbeat tick.
 *
 * GUARDED: only usable by @qa.8os.ai accounts, or anyone when
 * ROLLUP_DEV_RUN=1 is set. Everyone else gets 403. Clerk/QA-authed (authOrQa
 * so the probe can drive it with X-QA-USER-ID), rate-limited, userId-scoped.
 *
 * Body (all optional):
 *   {
 *     targetDate: "YYYY-MM-DD",            // local day to roll up (defaults to yesterday)
 *     ledger?: [{ goalId?: string|null, minutes: number, actions?: number }],
 *     inbox?:  [{ read?: boolean, playbook?: string }],
 *     runs?:   [{ kind: string, status?: string }],   // seeds completed rituals
 *   }
 * Seeds are written for `targetDate` (or the resolved day) and then the rollup
 * runs. Returns the seeded counts + the rollup result. Non-destructive.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authOrQa } from '@/lib/memory/qa-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { runDailyRollup } from '@/lib/rollup/daily-user-stats'
import { DEFAULT_TIMEZONE, getUserTimezone, userDayBounds } from '@/lib/user-time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Schema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ledger: z
    .array(z.object({
      goalId: z.string().max(200).nullable().optional(),
      minutes: z.number().int().min(0).max(1440),
      actions: z.number().int().min(0).max(500).optional(),
    }))
    .max(50)
    .optional(),
  inbox: z
    .array(z.object({
      read: z.boolean().optional(),
      playbook: z.string().max(60).optional(),
    }))
    .max(50)
    .optional(),
  runs: z
    .array(z.object({
      kind: z.string().max(60),
      status: z.string().max(20).optional(),
    }))
    .max(50)
    .optional(),
})

export async function POST(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  const limited = enforceRateLimit(req, RATE_LIMITS.sourcesDevSeed, userId)
  if (limited) return limited

  // ── Guard: QA accounts or explicit env flag only ──
  if (process.env.ROLLUP_DEV_RUN !== '1') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!user?.email || !user.email.toLowerCase().endsWith('@qa.8os.ai')) {
      return NextResponse.json({ error: 'dev-run is restricted to QA accounts' }, { status: 403 })
    }
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { ledger, inbox, runs } = parsed.data

  const tz = await getUserTimezone(userId).catch(() => DEFAULT_TIMEZONE)
  // Resolve the local day (default: yesterday, the day a midnight tick closes).
  const targetDate = parsed.data.targetDate
    ?? userDayBounds(tz, new Date(Date.now() - 24 * 60 * 60 * 1000)).localDate
  const bounds = userDayBounds(tz, new Date(`${targetDate}T12:00:00.000Z`))
  // A timestamp comfortably inside the local day (its start + 6h), for time-
  // bucketed rows (inbox/agent_runs) so they land on the target local date.
  const midDay = new Date(bounds.start.getTime() + 6 * 60 * 60 * 1000)

  const seeded = { ledger: 0, inbox: 0, runs: 0 }

  // ── attention_ledger (per-goal minutes for the day). goalId=NULL = unaligned.
  for (const l of ledger ?? []) {
    await prisma.attentionLedger.create({
      data: {
        userId,
        goalId: l.goalId ?? null,
        day: new Date(`${targetDate}T00:00:00.000Z`),
        minutes: l.minutes,
        actions: l.actions ?? 0,
        mentions: 0,
      },
    }).catch((e) => { console.error('[rollup/dev-run] ledger seed failed:', e) })
    seeded.ledger++
  }

  // ── inbox_messages (proactive sent/opened).
  for (const m of inbox ?? []) {
    await prisma.inboxMessage.create({
      data: {
        userId,
        title: 'QA seeded',
        body: 'QA seeded proactive message.',
        meta: m.playbook ? { playbook: m.playbook } : undefined,
        read: m.read ?? false,
        createdAt: midDay,
      },
    }).catch((e) => { console.error('[rollup/dev-run] inbox seed failed:', e) })
    seeded.inbox++
  }

  // ── agent_runs (completed rituals). idempotencyKey unique — QA-tagged.
  for (const r of runs ?? []) {
    await prisma.agentRun.create({
      data: {
        userId,
        kind: r.kind,
        idempotencyKey: `qa:${userId}:${r.kind}:${targetDate}:${randomUUID().slice(0, 8)}`,
        scheduledFor: midDay,
        startedAt: midDay,
        finishedAt: midDay,
        status: r.status ?? 'done',
      },
    }).catch((e) => { console.error('[rollup/dev-run] run seed failed:', e) })
    seeded.runs++
  }

  const result = await runDailyRollup(userId, { tz, targetDate })

  return NextResponse.json({ ok: result.ok, targetDate, seeded, rollup: result }, { status: 200 })
}
