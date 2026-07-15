/**
 * POST /api/alignment/correct — E-8 (backlog §4.3) attribution corrections loop.
 *
 * Body: { attributionId: string, correctedGoalId: string | null }
 *   - correctedGoalId = a goal id  → reassign the receipt to that goal.
 *   - correctedGoalId = null        → mark the receipt UNALIGNED.
 *
 * Sets user_override=true (sticky — runAttribution never re-classifies it) and
 * corrected_goal_id, so the ledger/verdict recompute on the next GET /api/alignment
 * reflect the human's call. Emits PostHog `attribution_corrected` with the
 * running correction rate (the attribution-accuracy gauge).
 *
 * Auth: authOrQa — plain Clerk requireAuth in production; the QA-only
 * `X-QA-USER-ID` header is honored ONLY for @qa.8os.ai users (see qa-auth.ts).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authOrQa } from '@/lib/memory/qa-auth'
import { applyCorrection } from '@/lib/alignment-engine'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { captureServerEvent } from '@/lib/analytics-server'
import { captureServerException } from '@/lib/error-track'

export async function POST(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.alignmentCorrect, auth.userId)
  if (limited) return limited

  let body: { attributionId?: unknown; correctedGoalId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }
  const attributionId = typeof body.attributionId === 'string' ? body.attributionId : null
  const correctedGoalId =
    body.correctedGoalId === null || body.correctedGoalId === undefined
      ? null
      : typeof body.correctedGoalId === 'string'
        ? body.correctedGoalId
        : undefined
  if (!attributionId) return NextResponse.json({ error: 'attributionId is required' }, { status: 400 })
  if (correctedGoalId === undefined) return NextResponse.json({ error: 'correctedGoalId must be a goal id or null' }, { status: 400 })

  try {
    const result = await applyCorrection(auth.userId, attributionId, correctedGoalId)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? 'correction failed' }, { status: 404 })
    }

    // Correction RATE over a rolling 30-day window — the accuracy gauge.
    const since = new Date(Date.now() - 30 * 86400000)
    const [total, corrected] = await Promise.all([
      prisma.alignmentAttribution.count({ where: { userId: auth.userId, sourceDate: { gte: since } } }),
      prisma.alignmentAttribution.count({ where: { userId: auth.userId, sourceDate: { gte: since }, userOverride: true } }),
    ])
    const correctionRate = total > 0 ? Math.round((corrected / total) * 1000) / 1000 : 0

    // PostHog: attribution_corrected (+ correction rate). Never blocks.
    try {
      captureServerEvent(auth.userId, 'attribution_corrected', {
        attribution_id: attributionId,
        corrected_goal_id: correctedGoalId,
        marked_unaligned: correctedGoalId === null,
        correction_rate: correctionRate,
        corrected_count: corrected,
        total_attributions: total,
      })
    } catch { /* analytics is best-effort */ }

    return NextResponse.json({
      ok: true,
      attribution: result.attribution,
      correctionRate,
      correctionStats: { total, corrected },
    })
  } catch (err) {
    console.error('[alignment/correct] failed:', err)
    captureServerException(err, { route: '/api/alignment/correct', userId: auth.userId })
    return NextResponse.json({ error: 'correction failed' }, { status: 500 })
  }
}
