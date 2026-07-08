import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, importSPKI } from 'jose'

// Routes that require authentication — everything else is public
const PROTECTED_PREFIXES = [
  '/settings',
  '/admin',
  '/dashboard',
  '/onboarding',
]

// ─── Security Headers (Task 11) ───────────────────────────────────────────────

const ALLOWED_ORIGIN = process.env.CORS_ALLOWED_ORIGIN ?? 'https://8os.ai'

function applySecurityHeaders(res: NextResponse, req: NextRequest): NextResponse {
  // HSTS — only over HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  // Prevent clickjacking
  res.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME sniffing
  res.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer policy
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy — disable features we don't use
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  )

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Next.js dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.deepseek.com https://us.i.posthog.com https://us-assets.i.posthog.com https://orchestrator-production-1643.up.railway.app https://api.8os.ai",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)

  // CORS — whitelist 8os.ai only
  const origin = req.headers.get('origin')
  if (origin === ALLOWED_ORIGIN) {
    res.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With',
    )
  }

  return res
}

// ─── Key cache ────────────────────────────────────────────────────────────────

let _publicKey: Awaited<ReturnType<typeof importSPKI>> | null = null

async function getPublicKey() {
  if (_publicKey) return _publicKey
  const pem = (process.env.JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n')
  if (!pem) return null
  try {
    _publicKey = await importSPKI(pem, 'RS256')
    return _publicKey
  } catch {
    return null
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // OS-1253 fix-forward (OS-1256): handle /en /zh /register at the edge
  // with a proper 307+Location so the redirect cannot be intercepted by
  // the global error boundary at build time. page.tsx stubs stay for
  // build-time coverage; runtime traffic never reaches them.
  if (pathname === '/en' || pathname === '/zh') {
    const res = NextResponse.redirect(new URL('/', req.url), 307)
    return applySecurityHeaders(res, req)
  }
  if (pathname === '/register') {
    const res = NextResponse.redirect(new URL('/signup', req.url), 307)
    return applySecurityHeaders(res, req)
  }
  // OS-2618: redirect legacy /signin alias to /login
  if (pathname === '/signin') {
    const res = NextResponse.redirect(new URL('/login', req.url), 307)
    return applySecurityHeaders(res, req)
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 })
    return applySecurityHeaders(preflight, req)
  }

  // Allow static assets and all API routes (API handlers manage their own auth)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/')
  ) {
    const res = NextResponse.next()
    return applySecurityHeaders(res, req)
  }

  // Only protect explicitly gated routes
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  if (!needsAuth) {
    const res = NextResponse.next()
    return applySecurityHeaders(res, req)
  }

  const token = req.cookies.get('access_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login?next=' + encodeURIComponent(pathname), req.url))
  }

  // Verify token
  const publicKey = await getPublicKey()
  if (publicKey) {
    try {
      await jwtVerify(token, publicKey, { issuer: '8os' })
    } catch {
      const refreshToken = req.cookies.get('refresh_token')?.value
      if (!refreshToken) {
        const res = NextResponse.redirect(new URL('/login?next=' + encodeURIComponent(pathname), req.url))
        res.cookies.delete('access_token')
        return res
      }
      const res = NextResponse.next()
      res.headers.set('x-needs-refresh', '1')
      return applySecurityHeaders(res, req)
    }
  }

  // RBAC: protect admin paths
  if (pathname.startsWith('/admin')) {
    const pk = await getPublicKey()
    if (pk) {
      try {
        const { payload } = await jwtVerify(token, pk, { issuer: '8os' })
        if (payload.role !== 'admin') {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      } catch {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }
  }

  const res = NextResponse.next()
  return applySecurityHeaders(res, req)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json)$).*)',
  ],
}
