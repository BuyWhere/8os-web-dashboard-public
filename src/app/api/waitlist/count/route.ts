import { NextResponse } from 'next/server';

const CANONICAL_API_URL = 'https://api.8os.ai';

// OS-6030 / OS-4794: the apex frontend DB is not the waitlist source of
// truth. Live 8os.ai was serving count=141 from local prisma while
// api.8os.ai had 3065. Always proxy the canonical public count.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await fetch(`${CANONICAL_API_URL}/api/waitlist/count`, {
      cache: 'no-store',
    });
    if (!r.ok) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }
    const data = (await r.json()) as { count?: number };
    return NextResponse.json({ count: data.count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
