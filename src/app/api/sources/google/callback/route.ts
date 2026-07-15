/**
 * GET /api/sources/google/callback — Google OAuth redirect target (E-1).
 *
 * Validates the sealed `state` (must decrypt, match the signed-in user, be
 * ≤10 min old), exchanges the code for tokens via plain fetch to
 * oauth2.googleapis.com/token (no googleapis SDK), stores them AES-encrypted
 * in external_signal_sources (one row per user+provider; reconnect refreshes
 * tokens and forces a full resync), kicks an initial sync, then sends the
 * user back to /settings/sources.
 *
 * Registered redirect URI: https://8os.ai/api/sources/google/callback
 * Dormant without creds: returns { configured: false } like /connect.
 * Clerk-authed (requireAuth) — the browser carries the Clerk session through
 * Google's redirect.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { encrypt, decrypt } from '@/lib/encryption'
import { appUrl } from '@/lib/app-url'
import {
  isGoogleCalendarConfigured,
  exchangeCodeForTokens,
  syncSource,
  GOOGLE_CALENDAR_PROVIDER,
  type StoredTokens,
} from '@/lib/external/google-calendar'

const STATE_MAX_AGE_MS = 10 * 60 * 1000

function settingsRedirect(req: NextRequest, qs: string): NextResponse {
  return NextResponse.redirect(appUrl(`/settings/sources?${qs}`), 307)
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'Google Calendar is not configured yet (GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET unset).',
    })
  }

  const sp = req.nextUrl.searchParams
  if (sp.get('error')) return settingsRedirect(req, `error=${encodeURIComponent(sp.get('error') as string)}`)

  const code = sp.get('code')
  const state = sp.get('state')
  if (!code || !state) return settingsRedirect(req, 'error=missing_code_or_state')

  // ── State: must decrypt, match the signed-in user, and be fresh ──
  let uid: string | null = null
  let ts = 0
  try {
    const parsed = JSON.parse(decrypt(state)) as { uid?: string; ts?: number }
    uid = typeof parsed.uid === 'string' ? parsed.uid : null
    ts = typeof parsed.ts === 'number' ? parsed.ts : 0
  } catch {
    return settingsRedirect(req, 'error=bad_state')
  }
  if (!uid || uid !== auth.userId) return settingsRedirect(req, 'error=state_user_mismatch')
  if (Date.now() - ts > STATE_MAX_AGE_MS) return settingsRedirect(req, 'error=state_expired')

  // ── Code → tokens (plain fetch) ──
  let tokens: StoredTokens
  try {
    tokens = await exchangeCodeForTokens(code)
  } catch (err) {
    console.error('[sources/google/callback] token exchange failed:', err)
    return settingsRedirect(req, 'error=token_exchange_failed')
  }

  // ── Store encrypted; one source per user+provider (reconnect = refresh) ──
  const existing = await prisma.externalSignalSource.findFirst({
    where: { userId: auth.userId, provider: GOOGLE_CALENDAR_PROVIDER },
  })

  let sourceId: string
  if (existing) {
    // Keep a previously-issued refresh_token if Google didn't return a new one.
    if (!tokens.refresh_token) {
      try {
        const prior = JSON.parse(decrypt(existing.encryptedTokens)) as StoredTokens
        if (prior.refresh_token) tokens.refresh_token = prior.refresh_token
      } catch {
        /* prior tokens unreadable — proceed with the fresh set */
      }
    }
    await prisma.externalSignalSource.update({
      where: { id: existing.id },
      data: {
        encryptedTokens: encrypt(JSON.stringify(tokens)),
        status: 'active',
        syncToken: null, // force a full −60d…+30d resync on reconnect
      },
    })
    sourceId = existing.id
  } else {
    const created = await prisma.externalSignalSource.create({
      data: {
        userId: auth.userId,
        provider: GOOGLE_CALENDAR_PROVIDER,
        encryptedTokens: encrypt(JSON.stringify(tokens)),
        status: 'active',
      },
    })
    sourceId = created.id
  }

  // ── Initial sync (best-effort; the UI's "Sync now" and the future
  //    heartbeat poller cover any failure here) ──
  try {
    await syncSource(sourceId)
  } catch (err) {
    console.error('[sources/google/callback] initial sync failed:', err)
  }

  return settingsRedirect(req, 'connected=google')
}
