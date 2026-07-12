/**
 * GET /api/sources — the caller's external-signal sources (E-1, backlog §4.2).
 *
 * Powers /settings/sources: per-source provider/status/last-sync plus a live
 * (non-deleted) event count, and whether the Google OAuth client is configured
 * at all (drives the "not configured yet" state of the Connect button).
 * Clerk-authed (requireAuth), userId-scoped.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { isGoogleCalendarConfigured } from '@/lib/external/google-calendar'
import { PROVIDER_CATALOG } from '@/lib/external/providers'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const sources = await prisma.externalSignalSource.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, provider: true, status: true, lastSyncedAt: true, createdAt: true },
    take: 20,
  })

  const counts = sources.length
    ? await prisma.externalEvent.groupBy({
        by: ['sourceId'],
        where: { userId: auth.userId, sourceId: { in: sources.map((s) => s.id) }, isDeleted: false },
        _count: { _all: true },
      })
    : []
  const countBySource = new Map(counts.map((c) => [c.sourceId, c._count._all]))

  // Provider catalog: Google is active; Outlook/365 + Apple/CalDAV are declared
  // "coming soon" behind the same ExternalSignalSource plug-in (see
  // lib/external/providers.ts). googleConfigured drives Google's connect button.
  const catalog = PROVIDER_CATALOG.map((p) =>
    p.provider === 'google_calendar'
      ? { ...p, configured: isGoogleCalendarConfigured() }
      : { ...p, configured: false },
  )

  return NextResponse.json({
    googleConfigured: isGoogleCalendarConfigured(),
    catalog,
    sources: sources.map((s) => ({
      id: s.id,
      provider: s.provider,
      status: s.status,
      lastSyncedAt: s.lastSyncedAt ? s.lastSyncedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      eventCount: countBySource.get(s.id) ?? 0,
    })),
  })
}
