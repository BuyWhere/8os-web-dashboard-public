/**
 * src/lib/error-track.ts — server-side PostHog error tracking (OS: PostHog for
 * everything; replaces the planned Sentry — owner decision 2026-07-04).
 *
 * Deliberately dependency-free: posts a `$exception` event straight to the
 * PostHog `/capture/` ingest endpoint over plain HTTPS (fetch), keyed off the
 * same NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST env the client SDK
 * uses (verified present in the Railway production environment — the older
 * posthog-node path in analytics-server.ts depends on POSTHOG_Project_token,
 * which is NOT set in prod, so it silently no-ops).
 *
 * Contract:
 *   - NEVER throws. Fire-and-forget safe: `captureServerException(err, ctx)`
 *     without await is fine (all rejections are swallowed internally).
 *   - Short timeout (3s) so a slow PostHog can never hold a request open.
 *   - No-op (sent:false) when the key is missing.
 *   - Returns the ingest response status so test routes/probes can assert
 *     acceptance (2xx) — we cannot verify UI appearance without a personal
 *     API key, ingest acceptance is the verifiable boundary.
 */

export interface ErrorTrackContext {
  route?: string
  userId?: string
  extra?: Record<string, unknown>
}

export interface CaptureResult {
  sent: boolean
  /** HTTP status from the PostHog ingest endpoint, when a request was made. */
  status?: number
  reason?: string
}

const TIMEOUT_MS = 3000

function posthogHost(): string {
  const h = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
  return h.replace(/\/+$/, '')
}

/**
 * Capture a server-side exception as a PostHog `$exception` event.
 * Property shape follows PostHog's error-tracking spec ($exception_list /
 * $exception_message / $exception_type) so events group in the Error Tracking
 * product alongside client-side captures.
 */
export async function captureServerException(
  error: unknown,
  context: ErrorTrackContext = {},
): Promise<CaptureResult> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!apiKey) return { sent: false, reason: 'NEXT_PUBLIC_POSTHOG_KEY not set' }

    const err = error instanceof Error ? error : new Error(String(error))
    const type = err.name || 'Error'
    const message = err.message || 'Unknown error'

    const payload = {
      api_key: apiKey,
      event: '$exception',
      distinct_id: context.userId || 'server',
      timestamp: new Date().toISOString(),
      properties: {
        // PostHog error-tracking property spec
        $exception_list: [
          {
            type,
            value: message,
            mechanism: { handled: true, synthetic: false },
          },
        ],
        $exception_message: message,
        $exception_type: type,
        $exception_source: 'server',
        // App context
        route: context.route,
        userId: context.userId,
        stack: typeof err.stack === 'string' ? err.stack.slice(0, 8000) : undefined,
        $lib: '8os-server',
        ...(context.extra || {}),
      },
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(`${posthogHost()}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      return { sent: res.ok, status: res.status }
    } finally {
      clearTimeout(timer)
    }
  } catch (e) {
    // Monitoring must never break the app — swallow everything.
    try {
      console.error('[error-track] capture failed:', e instanceof Error ? e.message : e)
    } catch { /* noop */ }
    return { sent: false, reason: e instanceof Error ? e.message : 'capture failed' }
  }
}
