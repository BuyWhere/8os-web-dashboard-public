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
  // Keep users on the canonical host. The CF worker proxies to the origin with
  // the raw *.up.railway.app Host, so redirects built from req.url (our explicit
  // ones + Clerk's auth redirect to /login) get a Location pointing at the raw
  // Railway domain — which strands the user there. Rewrite it back to 8os.ai.
  // Output-only (never touches the incoming request host), so it can't trigger
  // the x-middleware-rewrite → Railway 100:: "Error 1000" path.
  const loc = res.headers.get('location')
  if (loc && /\.up\.railway\.app/i.test(loc)) {
    res.headers.set('location', loc.replace(/(?:https?:)?\/\/[^/]*\.up\.railway\.app/i, `https://${CANONICAL}`))
  }
  return res
}

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/goals(.*)',
  '/calendar(.*)',
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
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('next', req.nextUrl.pathname)
  const loginUrlStr = loginUrl.toString()
  const signupUrl = new URL('/signup', req.url).toString()

  if (isAdminRoute(req)) {
    await auth.protect((has) => has({ role: 'org:admin' }), {
      unauthenticatedUrl: loginUrlStr,
    })
  } else if (isOnboardingRoute(req)) {
    // OS-3649: Public CTAs use "free" copy and link to /onboarding. Unauthenticated
    // users should land on /signup (not /login) to preserve conversion intent.
    await auth.protect({ unauthenticatedUrl: signupUrl })
  } else if (isProtectedRoute(req)) {
    // QA/API probes: API routes carrying the X-QA-USER-ID header skip the Clerk
    // redirect and fall through to the route's requireAuth, which only honours
    // the header for existing @qa.8os.ai accounts (same trust model as
    // src/lib/memory/qa-auth.ts). Lets automated QA exercise /api/assistant etc.
    const isQaApiProbe = req.nextUrl.pathname.startsWith('/api/') && !!req.headers.get('x-qa-user-id')
    if (!isQaApiProbe) {
      // OS-5918: any missing/invalid Clerk userId on a protected page must 307
      // to /login. protect() can rewrite to a blank 404 when the cookie is
      // present but the session is dead (x-clerk-auth-reason: protect-rewrite).
      const session = await auth()
      if (!session.userId) {
        loginUrl.searchParams.set('reason', 'session-expired')
        return NextResponse.redirect(loginUrl, 307)
      }
      await auth.protect({ unauthenticatedUrl: loginUrlStr })
    }
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
  // OS-4314: /coming-soon was a prelaunch reserve page; the App Router route
  // only called redirect() which does NOT handle RSC prefetch (?_rsc=...) requests —
  // those return 404 because the static route wins over next.config redirects.
  // Fix: delete the route file and handle the redirect at the edge so RSC probes
  // also get a clean 307 → /signup before any route resolution.
  if (pathname === '/coming-soon') {
    return applyCSP(NextResponse.redirect(new URL('/signup', req.url), 307))
  }
  // OS-5916: /help and CLI-style /--help are not product routes. Send to /contact
  // at the edge so RSC prefetch and next.config misses still get a 307, not 404.
  if (pathname === '/help' || pathname === '/--help') {
    return applyCSP(NextResponse.redirect(new URL('/contact', req.url), 307))
  }
  // OS-5932: /docs is not a product route (docs live at /developers). Edge
  // 307 so RSC prefetch (?_rsc=) and next.config misses still avoid the 404.
  if (pathname === '/docs' || pathname.startsWith('/docs/')) {
    return applyCSP(NextResponse.redirect(new URL('/developers', req.url), 307))
  }

  // OS-7223: production 8os.ai is Railway Next.js (x-railway-edge), not Vercel.
  // vercel.json rewrites never fire there. The /api/count App Router handler
  // is also missing from the stale Railway standalone build, so probes get
  // HTML 404. Rewrite at the edge to the live FastAPI counter.
  if (pathname === '/api/count') {
    return applyCSP(
      NextResponse.rewrite(new URL('https://api.8os.ai/api/waitlist/count')),
    )
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
