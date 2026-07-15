/**
 * POST /api/redirections/:id/decline — dismiss a proposal + capture why (E-7, §5).
 *
 * Body: { reason: 'busy' | 'wrong_goal' | 'not_now' }
 *
 * The decline reason is free training signal (§5): "busy" = the slot was bad,
 * "wrong_goal" = the starving-goal selection was off, "not_now" = timing. We
 * store it on the proposal and emit `redirection_declined`.
 *
 * Idempotent: declining an already-declined proposal is a no-op 200; declining
 * an accepted/expired one is a 409 (nothing to decline).
 *
 * Clerk-authed, rate-limited (redirections preset).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { captureRedirectionEvent, DECLINE_REASONS, type DeclineReason } from '@/lib/redirections'
import { captureServerException } from '@/lib/error-track'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.redirections, auth.userId)
  if (limited) return limited

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const reason = body?.reason as DeclineReason | undefined
  if (!reason || !DECLINE_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: `reason must be one of ${DECLINE_REASONS.join(', ')}.` },
      { status: 400 },
    )
  }

  try {
    const proposal = await prisma.redirectionProposal.findFirst({
      where: { id, userId: auth.userId },
    })
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 })
    }
    if (proposal.status === 'declined') {
      return NextResponse.json({ proposalId: proposal.id, status: 'declined', reason: proposal.declineReason })
    }
    if (proposal.status !== 'open') {
      return NextResponse.json(
        { error: `Proposal is ${proposal.status}.`, proposalId: proposal.id },
        { status: 409 },
      )
    }

    await prisma.redirectionProposal.update({
      where: { id: proposal.id },
      data: { status: 'declined', declineReason: reason, decidedAt: new Date() },
    })

    const analytics = await captureRedirectionEvent(auth.userId, 'redirection_declined', {
      proposalId: proposal.id,
      goalId: proposal.goalId,
      sourceKind: proposal.sourceKind,
      reason,
    })

    return NextResponse.json({ proposalId: proposal.id, status: 'declined', reason, analytics })
  } catch (err) {
    console.error('[redirections] decline failed:', err)
    captureServerException(err, { route: '/api/redirections/:id/decline', userId: auth.userId })
    return NextResponse.json({ error: 'Could not decline the redirection.' }, { status: 500 })
  }
}
