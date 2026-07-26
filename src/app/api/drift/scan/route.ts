import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authOrQa } from '@/lib/memory/qa-auth'
import { runAttribution, computeLedger, computeAlignment } from '@/lib/alignment-engine'
import { ensureProposal } from '@/lib/redirections'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { captureServerException } from '@/lib/error-track'
import { detectDriftSignals } from '@/lib/drift-engine'
import { generateCoachingNudges } from '@/lib/coaching-engine'

/**
 * GET /api/drift/scan
 *
 * Flow-AI agent contract adapter over the Alignment Engine. It computes the
 * same live drift/accountability signal used by /api/alignment, but returns a
 * compact shape for proactive nudges and weekly-review routing.
 *
 * Optional query params:
 *   - full=1: include debug attributions and 30-day window
 *   - debug=1: include raw alignment attribution records
 *   - signals=1: include new drift signal detection (goal_abandonment, priority_inversion, etc.)
 *   - nudges=1: include archetype-appropriate coaching nudges
 */
export async function GET(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.alignment, auth.userId)
  if (limited) return limited

  const sp = req.nextUrl.searchParams
  const full = sp.get('full') === '1'
  const debug = sp.get('debug') === '1'
  const includeSignals = sp.get('signals') === '1' || sp.get('full') === '1'
  const includeNudges = sp.get('nudges') === '1' || sp.get('full') === '1'
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

    let driftSignals: Awaited<ReturnType<typeof detectDriftSignals>> = []
    let coachingNudges: ReturnType<typeof generateCoachingNudges> = []
    if (includeSignals || includeNudges) {
      try {
        driftSignals = await detectDriftSignals(auth.userId, days)
        if (includeNudges) {
          const archetype = await prisma.archetypeResult.findUnique({
            where: { userId: auth.userId },
            select: { archetypeId: true },
          })
          coachingNudges = generateCoachingNudges(driftSignals, auth.userId, archetype?.archetypeId ?? 'pioneer')
        }
      } catch (error) {
        console.error('[drift/scan] signal detection failed:', error)
        captureServerException(error, { route: '/api/drift/scan', userId: auth.userId, extra: { phase: 'detectDriftSignals' } })
      }
    }

    const driftDetected = unalignedShare >= 0.25 || !!redirectionProposal || driftSignals.length > 0

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
      signals: includeSignals ? driftSignals : undefined,
      coachingNudges: includeNudges ? coachingNudges : undefined,
      signalSummary: includeSignals
        ? {
            totalSignals: driftSignals.length,
            highCount: driftSignals.filter((s) => s.severity === 'high').length,
            mediumCount: driftSignals.filter((s) => s.severity === 'medium').length,
            lowCount: driftSignals.filter((s) => s.severity === 'low').length,
          }
        : undefined,
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
