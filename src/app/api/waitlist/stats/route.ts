import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// OS-1719: query waitlist_entries directly from the shared Postgres DB
// via Prisma raw SQL, instead of proxying to the orchestrator (which no
// longer serves api.8os.ai after the OS-1718 redeploy replaced it with
// the Next.js frontend).
//
// OS-1847: removed ADMIN_SECRET gate — the orchestrator at api.8os.ai/waitlist/stats
// already serves this data publicly (no auth). The frontend dashboard needs
// unauthenticated access to display the waitlist count on the landing page.

// OS-1885: force per-request SSR. Without `dynamic = 'force-dynamic'`, Next.js
// ISR caches the entire route response at the Vercel edge and serves a stale
// `{"count":0,"entries":[]}` snapshot even though Prisma is wired up. Mirrors
// the working `/api/waitlist/count` route which sets the same directive.
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const count = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM waitlist_entries
    `;
    const entries = await prisma.$queryRaw<
      Array<{
        id: string;
        email: string;
        source: string;
        archetype: string | null;
        affiliate_opt_in: boolean;
        early_access_sent: boolean;
        created_at: Date;
      }>
    >`
      SELECT id, email, source, archetype, affiliate_opt_in, early_access_sent, created_at
      FROM waitlist_entries
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      count: Number(count[0].count),
      entries: entries.map((e) => ({
        id: e.id,
        email: e.email,
        source: e.source,
        archetype: e.archetype,
        early_access_sent: e.early_access_sent,
        created_at: e.created_at.toISOString(),
      })),
    });
  } catch (err) {
    console.error('Waitlist stats DB error:', err);
    return NextResponse.json({ count: 0, entries: [] }, { status: 200 });
  }
}
