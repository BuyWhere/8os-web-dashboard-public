import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// OS-1173: prefer a configurable orchestrator URL. The default previously
// pointed to https://api.8os.ai which was the Railway orchestrator; after
// the OS-1718 redeploy, api.8os.ai now serves the Next.js frontend.
// OS-1719: default to the direct Railway orchestrator URL so POST/join
// still works even without the env var override.
const ORCHESTRATOR_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.ORCHESTRATOR_URL ||
  'https://orchestrator-production-1643.up.railway.app';

// OS-1173: allow the prelaunch /coming-soon landing page to attribute its
// signups (vs the dashboard waitlist form, telegram bot, and 8os.ai homepage).
// Order matters only for the /waitlist/stats attribution histogram.
const ALLOWED_SOURCES = [
  'dashboard',
  'telegram',
  'api',
  'coming-soon',
  'how-it-works',
  'pricing',
  'quiz',
  'homepage',
  'product-hunt',
  'reddit',
  'podcast',
];

// OS-1173: any source not on the list still goes through, but is normalized
// to a slug (e.g. "Morning Brew #42" → "morning-brew-42") so channel
// attribution is preserved while source length stays inside the 64-char
// VARCHAR cap on the waitlist_entries table. The FastAPI backend has its
// own pass that re-applies this normalization.

// OS-1242: reserved/special-use TLDs the orchestrator's pydantic EmailStr
// rejects with 422 "special-use or reserved name". Verified against live
// api.8os.ai on 2026-06-17. The proxy mirrors the check so reserved-TLD
// input never round-trips to the orchestrator and never wraps as a
// misleading 502 to the form.
//
// Note: `.example` is NOT in the list — pydantic accepts it (the smoke
// probe at scripts/smoke-probe-8os.sh posts to @paperclip.example
// intentionally; that path must keep working). Only the TLDs that
// pydantic's email-validator actually rejects are listed.
const RESERVED_TLDS = new Set([
  'local',       // RFC 6762: mDNS link-local
  'localhost',   // RFC 6761: loopback
  'test',        // RFC 2606: testing
  'invalid',     // RFC 2606: obviously invalid
  'onion',       // RFC 7686: Tor hidden services
]);
function normalizeSource(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'dashboard';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (email.length > 254) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // OS-1242: pre-validate reserved/special-use TLDs (RFC 6761 / RFC 2606)
    // at the proxy so reserved-TLD emails return 400 with the same
    // "Invalid email format" shape as other invalid-input cases, instead
    // of being wrapped as 502 "Upstream waitlist service unavailable" by
    // the catch-all error handler below. Real users typing typos like
    // `gmail.local` (a common .com mis-type) used to see a generic
    // server-error page; the orchestrator's pydantic EmailStr rejects
    // them with 422 + a useful detail, and we now catch them client-side
    // to avoid the round-trip and the misleading 502.
    const tld = email.toLowerCase().split('.').pop() ?? '';
    if (RESERVED_TLDS.has(tld)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const rawSource = typeof body.source === 'string' ? body.source : 'dashboard';
    const source = ALLOWED_SOURCES.includes(rawSource) ? rawSource : normalizeSource(rawSource);

    // OS-1173: forward affiliate_opt_in from the /coming-soon form to the
    // FastAPI orchestrator so the new boolean column captures opt-in
    // alongside email + source. Legacy forms omit the field; the FastAPI
    // schema defaults it to False so existing callers stay unchanged.
    const affiliateOptIn = body.affiliate_opt_in === true;

    // OS-1173: the FastAPI route is /waitlist/join (not /waitlist). The
    // previous proxy posted to /waitlist which returned 404, so the live
    // 8os.ai waitlist form was silently broken and never captured a single
    // signup. Fix the path so the existing form starts working too.
    // OS-1744: orchestrator returning 500 on all routes.
    // Write directly to database via Prisma instead of proxying.
    // OS-6023: generate UUID for id column since DB expects it
    try {
      await prisma.$executeRaw`
        INSERT INTO waitlist_entries (id, email, source, affiliate_opt_in)
        VALUES (uuid_generate_v4(), ${email}, ${source}, ${affiliateOptIn})
      `;
    } catch (insertErr) {
      const msg = insertErr instanceof Error ? insertErr.message : '';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return NextResponse.json(
          { error: 'Email already on waitlist' },
          { status: 409 }
        );
      }
      console.error('Waitlist insert error:', insertErr);
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      );
    }

    // Compute position and total directly from the database
    const posRow = await prisma.$queryRaw<[{ position: bigint; total: bigint }]>`
      SELECT
        (SELECT COUNT(*)::bigint FROM waitlist_entries WHERE email <= ${email}) AS position,
        (SELECT COUNT(*)::bigint FROM waitlist_entries) AS total
    `;

    return NextResponse.json({
      success: true,
      message: 'Successfully joined waitlist',
      position: Number(posRow[0].position),
      total: Number(posRow[0].total),
    });
  } catch (err) {
    // OS-1173: distinguish upstream/orchestrator failures from a malformed
    // request body. The catch wraps both `request.json()` and the fetch to
    // the orchestrator, so report the failure accurately so the form can
    // show a useful message.
    console.error('Waitlist proxy error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('JSON')) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Upstream waitlist service unavailable' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // OS-1719: direct DB query for /api/waitlist. The per-endpoint stats
  // handler lives at src/app/api/waitlist/stats/route.ts. This catch-all
  // GET returns the summary for the base /api/waitlist path.
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
        created_at: Date;
      }>
    >`
      SELECT id, email, source, archetype, created_at
      FROM waitlist_entries
      ORDER BY created_at ASC
      LIMIT 50
    `;

    return NextResponse.json({
      count: Number(count[0].count),
      entries: entries.map((e) => ({
        id: e.id,
        email: e.email,
        source: e.source,
        archetype: e.archetype,
        created_at: e.created_at.toISOString(),
      })),
    });
  } catch (err) {
    console.error('Waitlist stats DB error:', err);
    return NextResponse.json({ count: 0, entries: [] }, { status: 200 });
  }
}
