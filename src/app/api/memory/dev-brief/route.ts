/**
 * POST /api/memory/dev-brief — QA-only trigger of runDailyBrief (E-3/E-6).
 *
 * Generates the morning brief for the resolved user now (bypassing the heartbeat
 * scheduler) and returns the body + delivered inbox actions, so the probe can
 * assert due commitments surface with done/renegotiate/drop. Auth: resolveDevUser.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { resolveDevUser } from '@/lib/memory/qa-auth'
import { runDailyBrief } from '@/lib/playbooks/daily-brief'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const dev = await resolveDevUser(req)
  if (dev instanceof NextResponse) return dev

  const res = await runDailyBrief(dev.userId, { at: new Date() })
  const msg = await prisma.inboxMessage.findFirst({
    where: { userId: dev.userId, meta: { path: ['playbook'], equals: 'daily_brief' } },
    orderBy: { createdAt: 'desc' },
    select: { actionsJson: true, body: true },
  }).catch(() => null)
  const actions = Array.isArray(msg?.actionsJson)
    ? (msg!.actionsJson as Array<{ id: string }>).map((a) => a.id)
    : []

  return NextResponse.json({
    status: res.status,
    reason: res.reason,
    usedLlm: res.usedLlm,
    body: res.body ?? msg?.body ?? '',
    actions,
  })
}
