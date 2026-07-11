/**
 * GET /api/redirections — the user's OPEN redirection proposals (E-7, §5).
 *
 * One-tap redirection proposals turn the Alignment Engine's advisory "point
 * your next block at your starving #1 goal" into an operable card with a
 * concrete slot. This endpoint lists the currently-open proposals for the
 * dashboard AlignmentPanel + retro callout + inbox action renderer.
 *
 * Lazy expiry on read: any of this user's OPEN proposals older than 48h are
 * flipped to `expired` before the list is built (mirrors ensureProposal so a
 * stale proposal never renders as actionable).
 *
 * Clerk-authed (requireAuth, userId-scoped), rate-limited via the
 * `redirections` preset — same shape as GET /api/alignment.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { expireStaleProposals, toProposalDTO } from '@/lib/redirections'
import { captureServerException } from '@/lib/error-track'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.redirections, auth.userId)
  if (limited) return limited

  try {
    // Lazy expiry first — a >48h proposal must never appear open on read.
    await expireStaleProposals(auth.userId)

    const rows = await prisma.redirectionProposal.findMany({
      where: { userId: auth.userId, status: 'open' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Resolve goal names in one query (proposals are relation-free by design).
    const goalIds = Array.from(new Set(rows.map((r) => r.goalId)))
    const goals = goalIds.length
      ? await prisma.goal.findMany({
          where: { id: { in: goalIds }, userId: auth.userId },
          select: { id: true, name: true },
        })
      : []
    const nameById = new Map(goals.map((g) => [g.id, g.name]))

    const proposals = rows.map((r) => toProposalDTO(r, nameById.get(r.goalId) ?? 'Goal'))
    return NextResponse.json({ proposals })
  } catch (err) {
    console.error('[redirections] list failed:', err)
    captureServerException(err, { route: '/api/redirections', userId: auth.userId })
    return NextResponse.json({ error: 'Could not load redirections.' }, { status: 500 })
  }
}
