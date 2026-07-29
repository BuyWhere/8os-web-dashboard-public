/**
 * POST /api/alignment/tool-call — the HTTP-callable surface the v1 Alignment
 * Engine advertises in its summary route (`routes.toolCall`). Lets a remote
 * assistant (or any HTTP client that already fetched `/api/alignment/tool-spec`)
 * invoke the engine without a Clerk session and consume the same verdict
 * payload the in-app dashboard sees.
 *
 * Body: { days?: number (1..60, default 7), full?: boolean, debug?: boolean }
 *   - days   — lookback window (7 = weekly; 30 = monthly).
 *   - full   — deeper 30-day backfill, admin/dev use.
 *   - debug  — include raw attributions + attribution-run stats. QA-only by
 *              convention (the field is still returned when requested).
 *
 * The handler delegates to the same runAttribution/computeLedger/
 * computeAlignment pipeline as GET /api/alignment. Differences from the
 * summary route:
 *   - Request body instead of query string (tool callers send JSON).
 *   - 405 on non-POST (advertised as an action, not a viewer).
 *   - No automatic proposal injection — callers ask explicitly by including
 *     `full: true` (the dashboard surface still serves the redirection; this
 *     surface returns the raw verdict for downstream consumers).
 *
 * Auth: authOrQa — plain Clerk requireAuth in production; the QA-only
 * `X-QA-USER-ID` header is honored ONLY for @qa.8os.ai users (see qa-auth.ts).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authOrQa } from '@/lib/memory/qa-auth'
import { runAttribution, computeLedger, computeAlignment } from '@/lib/alignment-engine'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { captureServerException } from '@/lib/error-track'

const DAY_MS = 86400000

function intBetween(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : fallback
  if (n < lo) return lo
  if (n > hi) return hi
  return n
}

export async function POST(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.alignment, auth.userId)
  if (limited) return limited

  // Parse body. Tool callers always send JSON; we tolerate a missing/empty body
  // and apply defaults.
  let body: { days?: unknown; full?: unknown; debug?: unknown } = {}
  try {
    const text = await req.text()
    if (text.trim().length > 0) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const days = intBetween(body.days, 1, 60, 7)
  const full = body.full === true
  const debug = body.debug === true

  // Attribution is best-effort: if the classifier is down we still serve the
  // verdict from whatever is already attributed (items retry next request).
  let attribution
  try {
    attribution = await runAttribution(auth.userId, {
      sinceDays: full ? 30 : days,
      maxLlmItems: full ? 300 : 60,
    })
  } catch (err) {
    console.error('[alignment/tool-call] runAttribution failed:', err)
    captureServerException(err, { route: '/api/alignment/tool-call', userId: auth.userId, extra: { phase: 'runAttribution' } })
    attribution = { errors: [err instanceof Error ? err.message : 'attribution failed'] }
  }

  try {
    const ledger = await computeLedger(auth.userId, { days })
    const alignment = await computeAlignment(auth.userId, { days })

    const payload: Record<string, unknown> = { attribution, ledger, ...alignment }
    if (debug) {
      const since = new Date(Date.now() - days * DAY_MS)
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
      payload.debug = {
        correctionRate: (alignment as { correctionRate?: number }).correctionRate ?? 0,
        correctionStats: (alignment as { correctionStats?: unknown }).correctionStats ?? null,
        attributionStats: attribution,
        // lastFlowCall is added by /api/alignment (which has access to the Flow-AI
        // module's last-call log); this surface intentionally omits it to keep
        // the contract identical between debug=1 paths.
      }
    }
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[alignment/tool-call] failed:', err)
    captureServerException(err, { route: '/api/alignment/tool-call', userId: auth.userId })
    return NextResponse.json({ error: 'Alignment computation failed.' }, { status: 500 })
  }
}

// Defensive: the route is an action, not a viewer.
export async function GET() {
  return NextResponse.json(
    { error: 'method_not_allowed', message: 'POST /api/alignment/tool-call — see /api/alignment/tool-spec for the schema.' },
    { status: 405, headers: { Allow: 'POST' } },
  )
}