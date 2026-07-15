/**
 * src/lib/app-url.ts — the canonical public origin for building absolute redirect
 * URLs.
 *
 * NEVER build a redirect from `req.url` / `req.nextUrl`: 8os.ai is fronted by a
 * Cloudflare Worker that proxies to *.up.railway.app, so inside a route handler
 * the request URL carries the RAW railway host. Redirecting against it strands
 * the user on frontend-production-*.up.railway.app (the recurring "railway app
 * redirect" bug). Always redirect against this canonical origin instead.
 */
export function appOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://8os.ai'
}

export function appUrl(path: string): URL {
  return new URL(path, appOrigin())
}
