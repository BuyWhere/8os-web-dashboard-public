/**
 * POST /api/memory/dev-align — QA-only trigger for the alignment pipeline
 * (attribution → ledger) so the §3.7 golden-set harness can produce a REAL
 * attention ledger (per-goal share / tracked receipts) for a seeded scenario
 * user before it runs the daily brief.
 *
 * The real trigger, GET /api/alignment, is Clerk-only (requireAuth) and cannot
 * be driven by the QA header path. This route mirrors the other /api/memory/dev-*
 * routes: it resolves a @qa.8os.ai user via resolveDevUser and runs the same
 * runAttribution + computeLedger the alignment route runs — it does NOT change
 * any alignment logic (E-8 owns that; this only CALLS it). Never used by real
 * traffic (hard @qa.8os.ai email gate in resolveDevUser).
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDevUser } from '@/lib/memory/qa-auth'
import { runAttribution, computeLedger } from '@/lib/alignment-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const dev = await resolveDevUser(req)
  if (dev instanceof NextResponse) return dev

  let attribution: unknown = null
  try {
    attribution = await runAttribution(dev.userId, { sinceDays: 7, maxLlmItems: 60 })
  } catch (e) {
    attribution = { error: e instanceof Error ? e.message : String(e) }
  }
  const ledger = await computeLedger(dev.userId, { days: 7 }).catch((e) => ({
    error: e instanceof Error ? e.message : String(e),
  }))

  return NextResponse.json({ userId: dev.userId, attribution, ledger })
}
