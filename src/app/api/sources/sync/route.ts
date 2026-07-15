/**
 * POST /api/sources/sync — on-demand sync of the caller's external sources
 * (E-1). Rate-limited (Google API fan-out). Syncs every non-revoked source
 * and reports per-source results. The scheduled 30–60 min poller arrives with
 * the Phase-C heartbeat (E-3) — this endpoint is the manual/QA trigger until
 * then, and will be what the heartbeat driver calls per user.
 * Clerk-authed (requireAuth), userId-scoped.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { syncSource, type SyncResult } from '@/lib/external/google-calendar'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.sourcesSync, auth.userId)
  if (limited) return limited

  const sources = await prisma.externalSignalSource.findMany({
    where: { userId: auth.userId, status: { not: 'revoked' } },
    select: { id: true },
    take: 10,
  })

  const results: SyncResult[] = []
  for (const s of sources) {
    try {
      results.push(await syncSource(s.id))
    } catch (err) {
      results.push({
        sourceId: s.id,
        status: 'error',
        upserted: 0,
        tombstoned: 0,
        fullResync: false,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({ synced: results.filter((r) => r.status === 'synced').length, results })
}
