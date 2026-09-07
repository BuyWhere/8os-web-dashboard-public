import { NextRequest, NextResponse } from 'next/server';

const CANONICAL_API_URL = 'https://api.8os.ai';

// OS-6030 / OS-5160: never serve local waitlist_entries emails from the
// frontend origin. Unauthenticated requests 401 to match api.8os.ai.
// Authenticated requests proxy the canonical orchestrator.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const adminApiKey = process.env.ADMIN_API_KEY;
  const authHeader = request.headers.get('authorization');
  const statsApiKey = request.headers.get('x-waitlist-stats-api-key');
  const hasAdminBearer = !!adminSecret && authHeader === `Bearer ${adminSecret}`;
  const hasStatsApiKey = !!adminApiKey && statsApiKey === adminApiKey;
  if (!hasAdminBearer && !hasStatsApiKey) {
    return NextResponse.json({ detail: 'Invalid or missing API key' }, { status: 401 });
  }

  try {
    const includeTests = request.nextUrl.searchParams.get('include_tests') === 'true';
    const url = new URL(`${CANONICAL_API_URL}/api/waitlist/stats`);
    if (includeTests) url.searchParams.set('include_tests', 'true');
    const headers: HeadersInit = {};
    if (adminApiKey) headers['X-API-Key'] = adminApiKey;

    const r = await fetch(url, {
      cache: 'no-store',
      headers,
    });
    if (!r.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }
    const data = await r.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
