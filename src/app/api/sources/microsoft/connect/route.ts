/**
 * GET /api/sources/microsoft/connect — start the Outlook/Microsoft OAuth flow.
 * DORMANT WITHOUT CREDENTIALS: returns { configured: false } (200) until
 * MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET are set. Mirrors the Google
 * connect route (sealed `state` = uid+ts, ≤10 min, CSRF-bound). Clerk-authed.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { encrypt } from '@/lib/encryption'
import { isMicrosoftCalendarConfigured, buildConsentUrl } from '@/lib/external/microsoft-calendar'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  if (!isMicrosoftCalendarConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'Outlook Calendar is not configured yet (MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET unset).',
    })
  }

  const state = encrypt(JSON.stringify({ uid: auth.userId, ts: Date.now() }))
  return NextResponse.redirect(buildConsentUrl(state), 307)
}
