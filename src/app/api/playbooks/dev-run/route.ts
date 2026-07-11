/**
 * POST /api/playbooks/dev-run — QA-only trigger for the Phase-E rhythm playbooks.
 *
 * Body: { kind: 'weekly' | 'monthly' | 'quarterly' | 'annual' }
 *
 * The rhythm playbooks normally fire from the heartbeat tick on their real
 * boundaries (Sun evening / 流月 turnover / 12-week cycle / Lì Chūn). For the
 * qa/rhythm-probe we drive them on demand against the DEPLOYED app. This mirrors
 * /api/memory/dev-consolidate exactly: resolveDevUser gates to @qa.8os.ai users
 * (Clerk QA session OR X-QA-USER-ID header). It can NEVER run for a real user.
 *
 * It creates the SAME agent_runs idempotency row the tick would (kind +
 * `{userId}:{kind}:{idemSuffix}`), so idempotency is observable through this
 * path too — a second dev-run for the same weekly isoWeek is a no-op.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveDevUser } from '@/lib/memory/qa-auth'
import { prisma } from '@/lib/db/prisma'
import { getUserTimezone } from '@/lib/user-time'
import { isoWeekKey } from '@/lib/playbooks/rhythm-shared'
import { runWeekly } from '@/lib/playbooks/weekly'
import { runMonthly } from '@/lib/playbooks/monthly'
import { runQuarterly } from '@/lib/playbooks/quarterly'
import { runAnnual } from '@/lib/playbooks/annual'
import { onLiChunBoundary, onQuarterBoundary } from '@/lib/playbooks/rhythm-shared'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Schema = z.object({ kind: z.enum(['weekly', 'monthly', 'quarterly', 'annual']) })

/** The idempotency-key suffix each rhythm kind uses (matches the tick). */
async function idemSuffix(userId: string, kind: string, at: Date): Promise<string> {
  const tz = await getUserTimezone(userId).catch(() => 'UTC')
  if (kind === 'weekly') return isoWeekKey(tz, at)
  if (kind === 'monthly') {
    const iso = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' }).format(at).replace('-', '')
    return iso // yyyymm
  }
  if (kind === 'quarterly') return String(onQuarterBoundary(tz, at).cycleIndex)
  return String(onLiChunBoundary(tz, at).baziYear) // annual
}

export async function POST(req: NextRequest) {
  const dev = await resolveDevUser(req)
  if (dev instanceof NextResponse) return dev
  const userId = dev.userId

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { kind } = parsed.data
  const at = new Date()

  // Claim the agent_runs idempotency row (same contract as the tick).
  const idem = `${userId}:${kind}:${await idemSuffix(userId, kind, at)}`
  let runId: string | null = null
  let duplicate = false
  try {
    const run = await prisma.agentRun.create({
      data: { userId, kind, idempotencyKey: idem, scheduledFor: at, startedAt: at, status: 'running' },
      select: { id: true },
    })
    runId = run.id
  } catch {
    duplicate = true
  }

  if (duplicate) {
    return NextResponse.json({ userId, kind, idempotencyKey: idem, status: 'duplicate' })
  }

  const runner = kind === 'weekly' ? runWeekly
    : kind === 'monthly' ? runMonthly
    : kind === 'quarterly' ? runQuarterly
    : runAnnual
  const res = await runner(userId, { runId: runId!, at })

  // Finalize the run row (mirror the tick).
  if (res.status === 'done') {
    await prisma.agentRun.update({
      where: { id: runId! },
      data: { status: 'done', finishedAt: new Date(), outputJson: (res.output ?? {}) as object, tokenCostJson: res.tokenCost ? (res.tokenCost as object) : undefined },
    }).catch(() => {})
  } else if (res.status === 'failed') {
    await prisma.agentRun.update({
      where: { id: runId! }, data: { status: 'failed', finishedAt: new Date(), outputJson: { reason: res.reason ?? 'unknown' } },
    }).catch(() => {})
  }
  // 'skipped' → the governor already wrote it.

  return NextResponse.json({
    userId, kind, idempotencyKey: idem, runId,
    status: res.status, reason: res.reason,
    inboxMessageId: res.inboxMessageId ?? null,
    body: res.body ?? null,
    output: res.output ?? null,
  })
}
