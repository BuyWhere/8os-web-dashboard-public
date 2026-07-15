import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { appUrl } from '@/lib/app-url'
import {
  buildGoogleAuthorizationUrl,
  createGoogleOauthFlowToken,
  getGoogleFlowCookieName,
  getGoogleFlowCookieOptions,
  sanitizeNextPath,
} from '@/lib/auth/google'

export async function GET(req: NextRequest) {
  const next = sanitizeNextPath(req.nextUrl.searchParams.get('next'), '/dashboard')
  const requestedMode = req.nextUrl.searchParams.get('mode')
  const mode = requestedMode === 'link' ? 'link' : 'login'

  let userId: string | undefined
  if (mode === 'link') {
    const token = req.cookies.get('access_token')?.value
    if (!token) {
      return NextResponse.redirect(appUrl(`/login?error=${encodeURIComponent('Sign in first to connect Google')}`))
    }

    try {
      const payload = await verifyAccessToken(token)
      userId = payload.sub
    } catch {
      return NextResponse.redirect(appUrl(`/login?error=${encodeURIComponent('Session expired. Sign in again to connect Google')}`))
    }
  }

  try {
    const { cookieValue, state } = await createGoogleOauthFlowToken(mode, next, userId)
    const response = NextResponse.redirect(buildGoogleAuthorizationUrl(state))
    response.cookies.set(getGoogleFlowCookieName(), cookieValue, getGoogleFlowCookieOptions())
    return response
  } catch (err) {
    // Defensive: AUTH_FLOW_SECRET or the three GOOGLE_* env vars are missing
    // in the deployed environment. Surface this as a friendly redirect to /login
    // instead of a generic 500 stack trace.
    console.error('[api/auth/google] OAuth env vars missing or invalid:', err)
    return NextResponse.redirect(
      appUrl(`/login?error=${encodeURIComponent('Google sign-in is temporarily unavailable')}`),
      { status: 307 },
    )
  }
}
