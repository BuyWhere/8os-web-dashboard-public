import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// OS-1752: public waitlist stats endpoint — no auth required.
// Replaces the broken orchestrator rewrite that returned 500.
// Used by the hourly waitlist monitoring routine.
export const dynamic = 'force-dynamic';

export async function GET() {
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
