/**
 * GET /api/sources/google/connect — start the Google Calendar OAuth flow (E-1).
 *
 * DORMANT WITHOUT CREDENTIALS: when GOOGLE_CALENDAR_CLIENT_ID /
 * GOOGLE_CALENDAR_CLIENT_SECRET are unset this returns `{ configured: false }`
 * (200) instead of redirecting — the settings UI renders "not configured yet".
 *
 * When configured: 307-redirects to Google's consent screen with the
 * calendar.readonly scope, access_type=offline + prompt=consent (so a
 * refresh_token is always issued). `state` is the userId + timestamp sealed
 * with the same AES-256-GCM util as birth data — the callback decrypts it and
 * requires it to match the signed-in user (CSRF binding, ≤10 min old).
 * Clerk-authed (requireAuth).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { encrypt } from '@/lib/encryption'
import { isGoogleCalendarConfigured, buildConsentUrl } from '@/lib/external/google-calendar'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'Google Calendar is not configured yet (GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET unset).',
    })
  }

  const state = encrypt(JSON.stringify({ uid: auth.userId, ts: Date.now() }))
  return NextResponse.redirect(buildConsentUrl(state), 307)
}
