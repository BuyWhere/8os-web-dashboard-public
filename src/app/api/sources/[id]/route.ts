/**
 * DELETE /api/sources/[id] — disconnect an external signal source (E-1),
 * optionally purging all data derived from it (E-14 privacy path).
 *
 * Default (no query param): best-effort revokes the Google OAuth grant
 * (oauth2.googleapis.com/revoke — dev-seeded and unconfigured sources skip
 * the network call), then marks the source `revoked`. Revoked sources are
 * excluded from every sync; their events stop being refreshed.
 *
 * ?purge=1 (E-14 "Disconnect & delete data"): after the upstream revoke,
 * ALSO deletes
 *   - the source's external_events rows,
 *   - the alignment_attributions derived from them (sourceType
 *     external_calendar, sourceId ∈ those event ids),
 *   - the attention_ledger rows for the affected user+days (the ledger is
 *     derived data — the next GET /api/alignment recomputes those days from
 *     the remaining attributions),
 *   - and finally the source row itself (with its encrypted token blob).
 *
 * Clerk-authed (requireAuth); every read/delete is scoped to the caller's
 * own userId.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { revokeGoogleTokens } from '@/lib/external/google-calendar'
import { captureServerException } from '@/lib/error-track'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // DESTRUCTIVE when ?purge=1 — assert identity sanity before anything else.
  const userId = auth.userId
  if (typeof userId !== 'string' || userId.trim().length < 8) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const source = await prisma.externalSignalSource.findFirst({
    where: { id: params.id, userId },
  })
  if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 })

  // Best-effort upstream revoke — never blocks the local disconnect.
  const upstreamRevoked = await revokeGoogleTokens(source.encryptedTokens).catch(() => false)

  const purge = req.nextUrl.searchParams.get('purge') === '1'
  if (!purge) {
    await prisma.externalSignalSource.update({
      where: { id: source.id },
      data: { status: 'revoked', syncToken: null },
    })
    return NextResponse.json({ ok: true, id: source.id, status: 'revoked', upstreamRevoked })
  }

  // ── Purge path ─────────────────────────────────────────────────────────────
  const purged = { events: 0, attributions: 0, ledgerRows: 0 }
  try {
    const events = await prisma.externalEvent.findMany({
      where: { sourceId: source.id, userId },
      select: { id: true },
    })
    const eventIds = events.map((e) => e.id)

    if (eventIds.length > 0) {
      // Which days did these events feed? (drives the ledger clear below)
      const atts = await prisma.alignmentAttribution.findMany({
        where: { userId, sourceType: 'external_calendar', sourceId: { in: eventIds } },
        select: { sourceDate: true },
      })
      const dayKeys = Array.from(new Set(atts.map((a) => a.sourceDate.toISOString().slice(0, 10))))
      const affectedDays = dayKeys.map((d) => new Date(`${d}T00:00:00.000Z`))

      purged.attributions = (
        await prisma.alignmentAttribution.deleteMany({
          where: { userId, sourceType: 'external_calendar', sourceId: { in: eventIds } },
        })
      ).count

      // Clear the derived ledger for the affected days; the next
      // GET /api/alignment rebuilds them from the surviving attributions.
      if (affectedDays.length > 0) {
        purged.ledgerRows = (
          await prisma.attentionLedger.deleteMany({
            where: { userId, day: { in: affectedDays } },
          })
        ).count
      }

      purged.events = (
        await prisma.externalEvent.deleteMany({ where: { sourceId: source.id, userId } })
      ).count
    }

    // Remove the source row itself — nothing references it (external_events
    // are already gone) and this also erases the encrypted token blob.
    await prisma.externalSignalSource.delete({ where: { id: source.id } })
  } catch (err) {
    captureServerException(err, {
      route: '/api/sources/[id]',
      userId,
      extra: { phase: 'purge', sourceId: source.id, purgedSoFar: purged },
    })
    return NextResponse.json(
      { error: 'Purge failed part-way, please retry.', purged, upstreamRevoked },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, id: source.id, status: 'purged', upstreamRevoked, purged })
}
