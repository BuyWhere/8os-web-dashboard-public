/**
 * GET /api/debug/error-test
 *
 * Throws a deliberate test error so we can confirm PostHog error tracking
 * captures it in production. Protected by DEBUG_SECRET env var to prevent abuse.
 *
 * Usage: curl https://8os.ai/api/debug/error-test?secret=<DEBUG_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { captureException } from '@/lib/monitoring/sentry'
import { alert5xx } from '@/lib/monitoring/telegram'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const expected = process.env.DEBUG_SECRET

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const testError = new Error(
    `[OS-533] Deliberate test error at ${new Date().toISOString()}, verify this appears in PostHog Error Tracking`,
  )

  // Capture server-side via PostHog Node SDK
  await captureException(testError, { source: 'error-test-endpoint', intentional: true })

  // Also fire Telegram alert if configured
  alert5xx('/api/debug/error-test', 500, testError)

  return NextResponse.json({
    ok: true,
    message: 'Test error captured, check PostHog Error Tracking dashboard',
    timestamp: new Date().toISOString(),
    posthogDashboard: 'https://us.posthog.com/error_tracking',
  })
}
