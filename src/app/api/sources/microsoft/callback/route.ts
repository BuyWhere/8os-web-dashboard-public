/**
 * GET /api/sources/microsoft/callback — Outlook/Microsoft OAuth redirect target.
 * Mirrors the Google callback: validate sealed state (≤10 min, same user),
 * exchange code → tokens, store AES-encrypted in external_signal_sources
 * (provider microsoft_calendar; one row per user+provider), kick an initial
 * sync, redirect to /settings/sources. Dormant without creds.
 * Registered redirect URI: https://8os.ai/api/sources/microsoft/callback
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { encrypt, decrypt } from '@/lib/encryption'
import {
  isMicrosoftCalendarConfigured,
  exchangeCodeForTokens,
  syncMicrosoftSource,
  MICROSOFT_CALENDAR_PROVIDER,
} from '@/lib/external/microsoft-calendar'
import type { StoredTokens } from '@/lib/external/google-calendar'

const STATE_MAX_AGE_MS = 10 * 60 * 1000

function settingsRedirect(req: NextRequest, qs: string): NextResponse {
  return NextResponse.redirect(new URL(`/settings/sources?${qs}`, req.nextUrl), 307)
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  if (!isMicrosoftCalendarConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'Outlook Calendar is not configured yet (MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET unset).',
    })
  }

  const sp = req.nextUrl.searchParams
  if (sp.get('error')) return settingsRedirect(req, `error=${encodeURIComponent(sp.get('error') as string)}`)

  const code = sp.get('code')
  const state = sp.get('state')
  if (!code || !state) return settingsRedirect(req, 'error=missing_code_or_state')

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

  let tokens: StoredTokens
  try {
    tokens = await exchangeCodeForTokens(code)
  } catch (err) {
    console.error('[sources/microsoft/callback] token exchange failed:', err)
    return settingsRedirect(req, 'error=token_exchange_failed')
  }

  const existing = await prisma.externalSignalSource.findFirst({
    where: { userId: auth.userId, provider: MICROSOFT_CALENDAR_PROVIDER },
  })

  let sourceId: string
  if (existing) {
    if (!tokens.refresh_token) {
      try {
        const prior = JSON.parse(decrypt(existing.encryptedTokens)) as StoredTokens
        if (prior.refresh_token) tokens.refresh_token = prior.refresh_token
      } catch { /* proceed with fresh set */ }
    }
    await prisma.externalSignalSource.update({
      where: { id: existing.id },
      data: { encryptedTokens: encrypt(JSON.stringify(tokens)), status: 'active', syncToken: null },
    })
    sourceId = existing.id
  } else {
    const created = await prisma.externalSignalSource.create({
      data: { userId: auth.userId, provider: MICROSOFT_CALENDAR_PROVIDER, encryptedTokens: encrypt(JSON.stringify(tokens)), status: 'active' },
    })
    sourceId = created.id
  }

  try {
    await syncMicrosoftSource(sourceId)
  } catch (err) {
    console.error('[sources/microsoft/callback] initial sync failed:', err)
  }

  return settingsRedirect(req, 'connected=microsoft')
}
