import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const CANONICAL = '8os.ai'

// ─── Content Security Policy ──────────────────────────────────────────────────
// Allow Clerk, Cloudflare, PostHog, Flow AI (via api.8os.ai / orchestrator).
// The Cloudflare Worker (8os-proxy) auto-augments CSP as a safety net, but the
// origin should also be correct so deploys without the Worker still work.
function applyCSP(res: NextResponse): NextResponse {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.8os.ai https://*.clerk.8os.ai https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://img.clerk.com https://clerk.8os.ai https://*.clerk.8os.ai",
    "font-src 'self'",
    "connect-src 'self' https://clerk.8os.ai https://*.clerk.8os.ai https://*.clerk.accounts.dev https://clerk-telemetry.com https://us.i.posthog.com https://us-assets.i.posthog.com https://orchestrator-production-1643.up.railway.app https://api.8os.ai",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)
  return res
}

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding(.*)',
  '/settings(.*)',
  '/admin(.*)',
  '/api/onboarding(.*)',
  '/api/user(.*)',
  '/api/assistant(.*)',
])

// Routes that require admin role
const isAdminRoute = createRouteMatcher(['/admin(.*)'])

// Onboarding routes redirect to /signup instead of /login for better conversion
// from public CTAs like "Generate My Life OS — Free"
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])

const clerk = clerkMiddleware(async (auth, req) => {
  // Clerk v6: the middleware `auth` helper is async and its methods are called
  // directly (await auth.protect()), NOT auth().protect() (that was Clerk v5 and
  // throws "auth(...).protect is not a function" at runtime -> 500 on every
  // protected route). protect() redirects unauthenticated users to the sign-in
  // URL (NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login) instead of 500-ing.
  const loginUrl = new URL('/login', req.url).toString()
  const signupUrl = new URL('/signup', req.url).toString()
  if (isAdminRoute(req)) {
    await auth.protect((has) => has({ role: 'org:admin' }), {
      unauthenticatedUrl: loginUrl,
    })
  } else if (isOnboardingRoute(req)) {
    // OS-3649: Public CTAs use "free" copy and link to /onboarding. Unauthenticated
    // users should land on /signup (not /login) to preserve conversion intent.
    await auth.protect({ unauthenticatedUrl: signupUrl })
  } else if (isProtectedRoute(req)) {
    // Clerk v6: bare protect() REWRITES signed-out users to a 404
    // (x-clerk-auth-reason: protect-rewrite). Passing unauthenticatedUrl makes
    // it a real redirect to /login instead. Authed users pass through; the QA
    // X-QA-USER-ID path is unaffected (it never hits Clerk middleware protect).
    await auth.protect({ unauthenticatedUrl: loginUrl })
  }
})

// The Cloudflare Worker (8os-proxy) proxies 8os.ai -> *.up.railway.app so Railway can route, which
// makes the app (and Railway's own edge) see the Railway host. Clerk then builds its session-sync
// handshake redirect_url against that host, so Clerk FAPI rejects the request with
// `malformed_request_parameters`. Force the canonical host BEFORE Clerk reads it (this rewrites the
// request the app sees — it does NOT issue a redirect, so it can't loop).
export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl

  // OS-1253 regression fix-forward (OS-3450): handle /en /zh /register at the
  // edge BEFORE Clerk runs. Page-level `redirect()` in these routes is
  // intercepted by Next.js build-time error handling and returned as
  // `__next_error__` without a Location header. Issuing a real
  // 307+Location at the edge is the only way to get a clean redirect.
  if (pathname === '/en' || pathname === '/zh') {
    return applyCSP(NextResponse.redirect(new URL('/', req.url), 307))
  }
  if (pathname === '/register') {
    return applyCSP(NextResponse.redirect(new URL('/signup', req.url), 307))
  }
  // OS-2618: redirect legacy /signin to /login
  if (pathname === '/signin') {
    return applyCSP(NextResponse.redirect(new URL('/login', req.url), 307))
  }
  // OS-3550: legacy/dead /famous prefetch target should canonicalize to
  // the actual famous archetypes index, including RSC probes like
  // /famous?_rsc=... that QA checks directly.
  if (pathname === '/famous') {
    return applyCSP(NextResponse.redirect(new URL('/archetypes/famous', req.url), 307))
  }

  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
    if (host.endsWith('.up.railway.app')) {
      try {
        req.headers.set('x-forwarded-host', CANONICAL)
        req.headers.set('x-forwarded-proto', 'https')
      } catch {
        /* headers may be immutable in some runtimes; nextUrl below is the primary fix */
      }
      try {
        req.nextUrl.host = CANONICAL
        req.nextUrl.protocol = 'https:'
        req.nextUrl.port = ''
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* never break the middleware chain */
  }
  const res = clerk(req, event)
  // Apply CSP to all responses (Clerk returns a NextResponse or Response)
  if (res instanceof NextResponse) {
    applyCSP(res)
  }
  return res
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless referenced in query params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes + Clerk's auto-proxy path
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
}
