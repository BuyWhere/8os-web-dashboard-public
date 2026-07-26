import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authOrQa } from '@/lib/memory/qa-auth'
import { runAttribution, computeLedger, computeAlignment } from '@/lib/alignment-engine'
import { ensureProposal } from '@/lib/redirections'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { captureServerException } from '@/lib/error-track'

/**
 * GET /api/drift/scan
 *
 * Flow-AI agent contract adapter over the Alignment Engine. It computes the
 * same live drift/accountability signal used by /api/alignment, but returns a
 * compact shape for proactive nudges and weekly-review routing.
 */
export async function GET(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.alignment, auth.userId)
  if (limited) return limited

  const sp = req.nextUrl.searchParams
  const full = sp.get('full') === '1'
  const debug = sp.get('debug') === '1'
  const days = full ? 30 : 7

  let attribution
  try {
    attribution = await runAttribution(auth.userId, { sinceDays: days, maxLlmItems: full ? 300 : 60 })
  } catch (error) {
    console.error('[drift/scan] runAttribution failed:', error)
    captureServerException(error, { route: '/api/drift/scan', userId: auth.userId, extra: { phase: 'runAttribution' } })
    attribution = { errors: [error instanceof Error ? error.message : 'attribution failed'] }
  }

  try {
    const ledger = await computeLedger(auth.userId, { days })
    const alignment = await computeAlignment(auth.userId, { days })
    let redirectionProposal = null
    try {
      const r = await ensureProposal(auth.userId, { sourceKind: 'alignment', alignment })
      redirectionProposal = r?.proposal ?? null
    } catch (error) {
      console.error('[drift/scan] ensureProposal failed:', error)
    }

    const weekly = (alignment as { weekly?: { headline?: string; topRedirection?: string; unalignedShare?: number; perGoal?: unknown[] } }).weekly ?? null
    const daily = (alignment as { daily?: { headline?: string; topRedirection?: string; unalignedShare?: number; perGoal?: unknown[] } }).daily ?? null
    const unalignedShare = weekly?.unalignedShare ?? daily?.unalignedShare ?? 0
    const driftDetected = unalignedShare >= 0.25 || !!redirectionProposal

    const payload: Record<string, unknown> = {
      contract: 'flow-ai.drift.scan.v1',
      generatedAt: new Date().toISOString(),
      windowDays: days,
      driftDetected,
      severity: unalignedShare >= 0.5 ? 'high' : unalignedShare >= 0.25 ? 'medium' : 'low',
      headline: weekly?.headline ?? daily?.headline ?? null,
      topRedirection: weekly?.topRedirection ?? daily?.topRedirection ?? null,
      unalignedShare,
      daily,
      weekly,
      redirection: redirectionProposal,
      attribution,
      ledger,
      actions: {
        briefing: '/api/briefing/today',
        briefingAction: '/api/briefing/action',
      },
    }

    if (debug) {
      const since = new Date(Date.now() - days * 86400000)
      payload.attributions = await prisma.alignmentAttribution.findMany({
        where: { userId: auth.userId, sourceDate: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          sourceType: true,
          sourceId: true,
          sourceDate: true,
          goalId: true,
          weight: true,
          minutes: true,
          rationale: true,
          confidence: true,
          userOverride: true,
          correctedGoalId: true,
          cacheKey: true,
        },
      })
      payload.debug = { attributionStats: attribution }
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[drift/scan] failed:', error)
    captureServerException(error, { route: '/api/drift/scan', userId: auth.userId })
    return NextResponse.json({ error: 'Drift scan failed.' }, { status: 500 })
  }
}
