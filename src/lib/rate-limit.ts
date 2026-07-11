/**
 * src/lib/rate-limit.ts
 *
 * Lightweight, dependency-free rate limiter for hot / abusable API routes.
 *
 * Strategy: sliding-window counter, keyed by BOTH the Clerk userId (when the
 * request is authenticated) AND the client IP. Whichever key trips its limit
 * first causes a 429. This means a single signed-in user cannot bypass the
 * limit by rotating IPs, and a single IP (e.g. behind NAT / a script) cannot
 * bypass it by rotating anonymous requests.
 *
 * Storage is an in-process Map of timestamp arrays. A periodic sweep drops
 * empty buckets so memory stays bounded.
 *
 * ⚠️ LIMITATION: this is IN-MEMORY and therefore PER-INSTANCE. 8os.ai runs as a
 * single Railway service instance, so a shared in-memory limiter is acceptable
 * today. If the app is ever scaled horizontally (>1 replica), each replica will
 * keep its own counters and the effective limit becomes (limit × replicaCount).
 * At that point move this to Redis (ioredis is already a dependency) or the
 * existing rate-limiter-flexible RateLimiterRedis in src/lib/auth/rate-limit.ts.
 */

import { NextRequest, NextResponse } from 'next/server'

export interface RateLimitConfig {
  /** Max requests allowed within the window, per key. */
  limit: number
  /** Sliding window length in milliseconds. */
  windowMs: number
  /** Namespace so different routes don't share counters. */
  name: string
}

interface Bucket {
  /** Ascending list of request timestamps (ms) still inside the window. */
  hits: number[]
}

// name -> (key -> bucket)
const store = new Map<string, Map<string, Bucket>>()

function getNamespace(name: string): Map<string, Bucket> {
  let ns = store.get(name)
  if (!ns) {
    ns = new Map<string, Bucket>()
    store.set(name, ns)
  }
  return ns
}

/**
 * Record a hit for `key` in namespace `name`. Returns whether the request is
 * allowed plus metadata for building the 429 / rate-limit headers.
 */
function hit(
  name: string,
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): { allowed: boolean; remaining: number; resetMs: number } {
  const ns = getNamespace(name)
  let bucket = ns.get(key)
  if (!bucket) {
    bucket = { hits: [] }
    ns.set(key, bucket)
  }

  const windowStart = now - windowMs
  // Drop timestamps that have aged out of the window.
  if (bucket.hits.length && bucket.hits[0] <= windowStart) {
    bucket.hits = bucket.hits.filter((t) => t > windowStart)
  }

  if (bucket.hits.length >= limit) {
    // Over the limit: reset is when the oldest in-window hit expires.
    const oldest = bucket.hits[0]
    const resetMs = Math.max(0, oldest + windowMs - now)
    return { allowed: false, remaining: 0, resetMs }
  }

  bucket.hits.push(now)
  const remaining = Math.max(0, limit - bucket.hits.length)
  const resetMs = windowMs
  return { allowed: true, remaining, resetMs }
}

/** Best-effort client IP from proxy headers (Cloudflare / Railway edge). */
function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Enforce a rate limit for the given request.
 *
 * @param req    the incoming request (for IP extraction + headers)
 * @param cfg    the limit config for this route
 * @param userId optional Clerk/app user id — when present, a per-user counter
 *               is enforced IN ADDITION to the per-IP counter.
 * @returns a 429 NextResponse if the limit is exceeded, otherwise null
 *          (caller proceeds normally).
 */
export function enforceRateLimit(
  req: NextRequest,
  cfg: RateLimitConfig,
  userId?: string | null,
): NextResponse | null {
  const now = Date.now()
  const ip = clientIp(req)

  const results: Array<{ allowed: boolean; remaining: number; resetMs: number }> = []
  // Per-IP counter always applies.
  results.push(hit(cfg.name, `ip:${ip}`, cfg.limit, cfg.windowMs, now))
  // Per-user counter when authenticated.
  if (userId) {
    results.push(hit(cfg.name, `user:${userId}`, cfg.limit, cfg.windowMs, now))
  }

  const blocked = results.find((r) => !r.allowed)
  const remaining = Math.min(...results.map((r) => r.remaining))

  if (blocked) {
    const retryAfterSec = Math.max(1, Math.ceil(blocked.resetMs / 1000))
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please slow down and try again shortly.',
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'RateLimit-Limit': String(cfg.limit),
          'RateLimit-Remaining': '0',
          'RateLimit-Reset': String(retryAfterSec),
        },
      },
    )
  }

  return null
}

// Periodic cleanup: drop empty buckets so the Map doesn't grow unbounded.
// Runs every 5 minutes; guarded so it only registers once per process and
// never keeps the process alive (unref) — safe for serverless-ish runtimes.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
type GlobalWithSweep = typeof globalThis & { __rateLimitSweepStarted?: boolean }
const g = globalThis as GlobalWithSweep
if (!g.__rateLimitSweepStarted) {
  g.__rateLimitSweepStarted = true
  const timer = setInterval(() => {
    const now = Date.now()
    // es5 target: iterate Maps via forEach to avoid downlevelIteration.
    store.forEach((ns, name) => {
      ns.forEach((bucket, key) => {
        // A bucket is stale if its newest hit is older than the largest
        // plausible window (10 min covers all configs below).
        const newest = bucket.hits[bucket.hits.length - 1] ?? 0
        if (now - newest > 10 * 60 * 1000) {
          ns.delete(key)
        }
      })
      if (ns.size === 0) store.delete(name)
    })
  }, CLEANUP_INTERVAL_MS)
  if (typeof timer.unref === 'function') timer.unref()
}

// ─── Per-route limit presets ──────────────────────────────────────────────────
// Sane defaults for the hot / cost-bearing endpoints. Tune here in one place.
export const RATE_LIMITS = {
  /** POST /api/assistant/chat — LLM streaming, expensive. */
  chat: { name: 'chat', limit: 20, windowMs: 60_000 },
  /** POST /api/capture — single-shot LLM capture. */
  capture: { name: 'capture', limit: 30, windowMs: 60_000 },
  /** POST /api/stripe/checkout — creates Stripe sessions. */
  checkout: { name: 'checkout', limit: 10, windowMs: 60_000 },
  /** GET /api/alignment — triggers LLM attribution. */
  alignment: { name: 'alignment', limit: 10, windowMs: 60_000 },
  /** POST /api/alignment/correct — E-8 human corrections; cheap DB write. */
  alignmentCorrect: { name: 'alignment-correct', limit: 40, windowMs: 60_000 },
  /** POST /api/onboarding/archetype — heavy archetype compute. */
  archetype: { name: 'archetype', limit: 10, windowMs: 60_000 },
  /** POST /api/telegram/webhook — inbound bot updates (per-IP; Telegram sends from a small IP set, so keep headroom). */
  telegramWebhook: { name: 'telegram-webhook', limit: 120, windowMs: 60_000 },
  /** POST /api/inbox/test — authed channel-layer test deliveries (QA). */
  inboxTest: { name: 'inbox-test', limit: 10, windowMs: 60_000 },
  /** POST /api/reveal — public pre-signup archetype compute (per-IP, unauthenticated). */
  reveal: { name: 'reveal', limit: 20, windowMs: 60_000 },
  /** POST /api/sources/sync — on-demand external-calendar sync (Google API fan-out, E-1). */
  sourcesSync: { name: 'sources-sync', limit: 6, windowMs: 60_000 },
  /** POST /api/sources/dev-seed — QA-only external-signal seeding (E-1 probe). */
  sourcesDevSeed: { name: 'sources-dev-seed', limit: 10, windowMs: 60_000 },
  /** GET /api/retro — 30-day retro verdict; first call runs a bounded LLM backfill (E-2). */
  retro: { name: 'retro', limit: 6, windowMs: 60_000 },
  /** GET /api/redirections + accept/decline — cheap DB ops; keep generous. */
  redirections: { name: 'redirections', limit: 20, windowMs: 60_000 },
  /** POST /api/mood - 1-tap mood/energy upsert from the shutdown ritual (E-9). */
  mood: { name: 'mood', limit: 30, windowMs: 60_000 },
  /** POST /api/mood/dev-seed - QA-only mood_logs seeding (E-9 probe). */
  moodDevSeed: { name: 'mood-dev-seed', limit: 20, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>
