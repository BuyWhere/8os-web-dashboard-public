/**
 * GET /api/mood/insights — E-9 weekly happiness-correlation insight (backlog §5).
 *
 * Surfaces the OBSERVATIONAL correlation between weekly attention share (per
 * life domain, from the alignment ledger) and weekly mean mood/energy (from
 * mood_logs). SUPPRESSED entirely unless n ≥ 10 mood logs AND |r| ≥ 0.3 on the
 * weekly aggregates — below threshold `available` is false and `insights` is [].
 *
 * Language is observational only, never causal or prescriptive (guardrails live
 * in src/lib/mood/mood.ts). This route reads the ledger via the existing table
 * shape only — it never touches alignment-engine.ts (E-8 owns it).
 *
 * Authed (Clerk requireAuth, userId-scoped).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { computeMoodInsights } from '@/lib/mood/mood'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const result = await computeMoodInsights(auth.userId)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[mood/insights] compute failed:', e)
    // Fail closed: suppressed, never a crash.
    return NextResponse.json({ available: false, logCount: 0, reason: 'compute error', insights: [] })
  }
}
