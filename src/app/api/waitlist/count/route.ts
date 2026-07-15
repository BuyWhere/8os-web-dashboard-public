import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// OS-1752: query DB directly instead of proxying to the orchestrator
// (which has no /waitlist/stats route and returns 500).
// Public waitlist count endpoint — no auth required.
// Used by the social proof counter on /coming-soon and landing page.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM waitlist_entries
    `;
    return NextResponse.json({ count: Number(result[0].count) });
  } catch {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
