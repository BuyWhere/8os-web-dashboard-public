/**
 * POST /api/inbox/test — Clerk-authed test delivery through the REAL channel
 * dispatcher (OS-2652 verification endpoint).
 *
 * Exercises deliver(): Telegram is attempted when configured+linked, and the
 * web-inbox record is always written. Scoped to the caller's own userId, so
 * it can only ever message the caller — safe to keep in prod for QA probes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { deliver } from '@/lib/channels'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  const limited = enforceRateLimit(req, RATE_LIMITS.inboxTest, userId)
  if (limited) return limited

  let body: { title?: string; body?: string } = {}
  try {
    body = await req.json()
  } catch {
    /* empty body is fine — use defaults */
  }

  const outcome = await deliver(userId, {
    title: typeof body.title === 'string' && body.title ? body.title.slice(0, 200) : 'Channel test',
    body: typeof body.body === 'string' && body.body ? body.body.slice(0, 2000)
      : 'This is a test delivery from the 8os channel layer (web inbox + any linked channels).',
    actions: [{ id: 'test:ack', label: 'Acknowledge' }],
    meta: { kind: 'channel_test', at: new Date().toISOString() },
  })

  return NextResponse.json({
    ok: outcome.delivered,
    inboxMessageId: outcome.inboxMessageId,
    results: outcome.results,
  })
}
