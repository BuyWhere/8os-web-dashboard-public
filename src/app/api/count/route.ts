import { NextResponse } from 'next/server';

const CANONICAL_API_URL = 'https://api.8os.ai';

// OS-7223: /api/count was 404 on every host (www/api/apex/telly/8os)
// because the only public waitlist counter lives at /api/waitlist/count.
// Heartbeats, probes, and older clients still hit the shorthand.
//
// OS-6161: re-export via 'import { GET as countGet }' doesn't work in
// Vercel standalone mode — the re-exported handler returns a 404 from
// the Railway edge instead of the Next.js handler. Inline the proxy.
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
