import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// OS-6030: restore ADMIN_SECRET gate. OS-1847 made this public so the
// landing page could show a count, but GET /api/waitlist/count already
// serves that without PII. Live 8os.ai /api/waitlist/stats was returning
// every waitlist email in JSON. Canonical api.8os.ai returns 401.
export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = request.headers.get('authorization');
  // OS-6519: public /api/waitlist/stats must never return entries/emails.
  // Match api.8os.ai 401. Count-only lives at /api/waitlist/count.
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return unauthorized();
  }

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
    return unauthorized();
  }
}
