/**
 * GET /api/retro — "Your last 30 days" retro-alignment verdict (E-2).
 *
 * Query params:
 *   ?days=30  — window length (clamped 7..60; default 30)
 *   ?check=1  — cheap "is there anything to retro?" existence probe (no
 *               backfill, no LLM) → { hasData } — used by the onboarding
 *               completion pointer.
 *
 * First call for a user runs a BOUNDED attribution backfill over the window
 * (≤ ~1,500 items on the existing lane) and can take a few seconds; each item
 * is classified once ever, so subsequent calls are cheap reads.
 *
 * Clerk-authed (requireAuth, userId-scoped), rate-limited 6/min (retro preset
 * in rate-limit.ts) — same route shape as GET /api/alignment.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { computeRetro, hasAttributableData } from '@/lib/retro'
import { ensureProposal } from '@/lib/redirections'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { captureServerException } from '@/lib/error-track'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.retro, auth.userId)
  if (limited) return limited

  const sp = req.nextUrl.searchParams

  if (sp.get('check') === '1') {
    try {
      return NextResponse.json({ hasData: await hasAttributableData(auth.userId) })
    } catch (err) {
      // The pointer is decorative — never surface an error for it.
      console.error('[retro] check failed:', err)
      return NextResponse.json({ hasData: false })
    }
  }

  const daysRaw = Number.parseInt(sp.get('days') ?? '30', 10)
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 7), 60) : 30

  try {
    const verdict = await computeRetro(auth.userId, { days })

    // E-7: turn the retro's starving-#1 redirection into an operable proposal
    // (its own 30-day starving goal + redirection sentence). Best-effort.
    let redirectionProposal = null
    try {
      if (verdict.hasData && verdict.starvingPriority && verdict.redirection) {
        const r = await ensureProposal(auth.userId, {
          sourceKind: 'retro',
          goalId: verdict.starvingPriority.goalId,
          rationale: verdict.redirection,
        })
        redirectionProposal = r?.proposal ?? null
      }
    } catch (e) {
      console.error('[retro] ensureProposal failed:', e)
    }

    return NextResponse.json({ ...verdict, redirectionProposal })
  } catch (err) {
    console.error('[retro] computeRetro failed:', err)
    captureServerException(err, { route: '/api/retro', userId: auth.userId })
    return NextResponse.json({ error: 'Retro computation failed.' }, { status: 500 })
  }
}
