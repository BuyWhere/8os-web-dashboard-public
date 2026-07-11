/**
 * GET /api/alignment — the Alignment Engine endpoint (OS-2542 step 2).
 *
 * On-demand incremental pipeline (the primary trigger — bounded cost, no cron):
 *   1. runAttribution — classify new calendar/task/journal/chat items in the
 *      window against the user's goals (ground-truth links skip the LLM; the
 *      rest go in ONE Flow AI call per ~20 items, each item classified once).
 *   2. computeLedger — rebuild per-(goal, day) attention rows for the window.
 *   3. computeAlignment — attention shares vs stated priorities + in-season
 *      favorability → per-goal momentum, daily + weekly verdicts, receipts.
 *
 * Query params:
 *   ?full=1  — deeper backfill (30-day window, higher LLM item cap) for
 *              admin/dev use.
 *   ?debug=1 — include the window's raw attributions (bounded) for QA.
 *
 * Authed via authOrQa: plain Clerk requireAuth in production; the QA-only
 * `X-QA-USER-ID` header is honored ONLY for @qa.8os.ai users (see qa-auth.ts) —
 * production behavior is unchanged. Goal ranking updates live at
 * POST /api/alignment/rank; corrections at POST /api/alignment/correct (E-8).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authOrQa } from '@/lib/memory/qa-auth'
import { runAttribution, computeLedger, computeAlignment } from '@/lib/alignment-engine'
import { ensureProposal } from '@/lib/redirections'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { captureServerException } from '@/lib/error-track'
import { lastFlowCall } from '@/lib/flow-ai'

export async function GET(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.alignment, auth.userId)
  if (limited) return limited

  const sp = req.nextUrl.searchParams
  const full = sp.get('full') === '1'
  const debug = sp.get('debug') === '1'
  const days = full ? 30 : 7

  // Attribution is best-effort: if the classifier is down we still serve the
  // verdict from whatever is already attributed (items retry next request).
  let attribution
  try {
    attribution = await runAttribution(auth.userId, {
      sinceDays: days,
      maxLlmItems: full ? 300 : 60,
    })
  } catch (err) {
    console.error('[alignment] runAttribution failed:', err)
    captureServerException(err, { route: '/api/alignment', userId: auth.userId, extra: { phase: 'runAttribution' } })
    attribution = { errors: [err instanceof Error ? err.message : 'attribution failed'] }
  }

  try {
    const ledger = await computeLedger(auth.userId, { days })
    const alignment = await computeAlignment(auth.userId, { days })

    // E-7: best-effort operable redirection — turn the starving-#1 verdict
    // into a concrete, conflict-free slot proposal. Never blocks the verdict.
    let redirectionProposal = null
    try {
      const r = await ensureProposal(auth.userId, { sourceKind: 'alignment', alignment })
      redirectionProposal = r?.proposal ?? null
    } catch (e) {
      console.error('[alignment] ensureProposal failed:', e)
    }

    const payload: Record<string, unknown> = { attribution, ledger, ...alignment, redirection: redirectionProposal }
    if (debug) {
      const since = new Date(Date.now() - days * 86400000)
      payload.attributions = await prisma.alignmentAttribution.findMany({
        where: { userId: auth.userId, sourceDate: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true, sourceType: true, sourceId: true, sourceDate: true,
          goalId: true, weight: true, minutes: true, rationale: true,
          confidence: true, userOverride: true, correctedGoalId: true, cacheKey: true,
        },
      })
      // E-8 debug: surface the correction rate + attribution run counters
      // (llmClassified / cacheReused) so QA can assert cache hits + accuracy.
      payload.debug = {
        correctionRate: (alignment as { correctionRate?: number }).correctionRate ?? 0,
        correctionStats: (alignment as { correctionStats?: unknown }).correctionStats ?? null,
        attributionStats: attribution,
        // E-8 (v): the lane + resolved model of the LAST Flow AI call in this
        // request — proves runAttribution routed through the cheap `attribution`
        // lane without needing the router's own logs.
        lastFlowCall: lastFlowCall(),
      }
    }
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[alignment] failed:', err)
    captureServerException(err, { route: '/api/alignment', userId: auth.userId })
    return NextResponse.json({ error: 'Alignment computation failed.' }, { status: 500 })
  }
}
