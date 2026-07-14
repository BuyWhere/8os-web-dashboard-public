/**
 * Microsoft / Outlook Calendar adapter (two-way) — mirrors google-calendar.ts.
 *
 * DORMANT WITHOUT CREDENTIALS: every entry point checks
 * isMicrosoftCalendarConfigured() (MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET)
 * and no-ops until an Azure app is registered and its creds are set as Railway
 * env. Redirect URI: https://8os.ai/api/sources/microsoft/callback. Uses the
 * Microsoft Graph API (delegated Calendars.ReadWrite + offline_access) via plain
 * fetch — no SDK. Reads sync into external_events (provider 'microsoft_calendar');
 * writes go through the same ext-<id> PATCH/DELETE path as Google.
 *
 * Setup for the operator (from the earlier instructions doc):
 *   Azure Portal → Microsoft Entra ID → App registrations → New registration
 *   (multi-tenant + personal), redirect https://8os.ai/api/sources/microsoft/callback,
 *   secret Value → MICROSOFT_CLIENT_SECRET, app id → MICROSOFT_CLIENT_ID,
 *   Graph delegated: Calendars.ReadWrite, offline_access, User.Read.
 */
import { prisma } from '@/lib/db/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import type { StoredTokens, SyncResult, NativeEventShape, GoogleWriteResult } from './google-calendar'

export const MICROSOFT_CALENDAR_PROVIDER = 'microsoft_calendar'

// Tenant `common` = work/school + personal Microsoft accounts.
const TENANT = 'common'
const AUTH_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
// Space-delimited delegated scopes. offline_access → refresh_token.
export const MICROSOFT_CALENDAR_SCOPE = 'offline_access openid Calendars.ReadWrite User.Read'

const PAST_WINDOW_DAYS = 60
const FUTURE_WINDOW_DAYS = 30
const PAGE_SIZE = 250
const MAX_PAGES = 20

// ─── Configuration ───────────────────────────────────────────────────────────

export function isMicrosoftCalendarConfigured(): boolean {
  return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
}

export function microsoftCalendarRedirectUri(): string {
  return process.env.MICROSOFT_REDIRECT_URI || 'https://8os.ai/api/sources/microsoft/callback'
}

export function buildConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || '',
    redirect_uri: microsoftCalendarRedirectUri(),
    response_type: 'code',
    response_mode: 'query',
    scope: MICROSOFT_CALENDAR_SCOPE,
    state,
    prompt: 'consent',
  })
  return `${AUTH_URL}?${params.toString()}`
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

interface MsTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
}

async function tokenRequest(body: Record<string, string>): Promise<MsTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  const json = (await res.json().catch(() => ({}))) as MsTokenResponse
  if (!res.ok) {
    throw new Error(`microsoft token endpoint ${res.status}: ${json.error ?? ''} ${json.error_description ?? ''}`.trim())
  }
  return json
}

export async function exchangeCodeForTokens(code: string): Promise<StoredTokens> {
  const r = await tokenRequest({
    code,
    client_id: process.env.MICROSOFT_CLIENT_ID || '',
    client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirect_uri: microsoftCalendarRedirectUri(),
    grant_type: 'authorization_code',
    scope: MICROSOFT_CALENDAR_SCOPE,
  })
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: r.expires_in ? Date.now() + r.expires_in * 1000 : undefined,
    scope: r.scope,
    token_type: r.token_type,
  }
}

async function refreshAccessToken(tokens: StoredTokens): Promise<StoredTokens> {
  if (!tokens.refresh_token) throw new Error('no refresh_token to refresh microsoft access')
  const r = await tokenRequest({
    client_id: process.env.MICROSOFT_CLIENT_ID || '',
    client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirect_uri: microsoftCalendarRedirectUri(),
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    scope: MICROSOFT_CALENDAR_SCOPE,
  })
  return {
    access_token: r.access_token,
    // MS may rotate the refresh_token; keep the new one, else retain the old.
    refresh_token: r.refresh_token ?? tokens.refresh_token,
    expires_at: r.expires_in ? Date.now() + r.expires_in * 1000 : undefined,
    scope: r.scope ?? tokens.scope,
    token_type: r.token_type ?? tokens.token_type,
  }
}

/** Resolve a live access token for a source, refreshing + persisting as needed. */
async function getAccessToken(sourceId: string): Promise<{ accessToken: string; userId: string } | null> {
  if (!isMicrosoftCalendarConfigured()) return null
  const source = await prisma.externalSignalSource.findUnique({ where: { id: sourceId } })
  if (!source || source.status === 'revoked' || source.provider !== MICROSOFT_CALENDAR_PROVIDER) return null
  let tokens: StoredTokens
  try { tokens = JSON.parse(decrypt(source.encryptedTokens)) as StoredTokens } catch { return null }
  if (tokens.dev) return null
  let accessToken = tokens.access_token
  const expiring = !tokens.expires_at || tokens.expires_at < Date.now() + 60_000
  if (!accessToken || expiring) {
    try {
      tokens = await refreshAccessToken(tokens)
      accessToken = tokens.access_token
      await prisma.externalSignalSource.update({ where: { id: source.id }, data: { encryptedTokens: encrypt(JSON.stringify(tokens)) } })
    } catch {
      await prisma.externalSignalSource.update({ where: { id: source.id }, data: { status: 'error' } })
      return null
    }
  }
  if (!accessToken) return null
  return { accessToken, userId: source.userId }
}

// ─── Read sync (Graph calendarView window → external_events) ──────────────────

interface MsEvent {
  id?: string
  iCalUId?: string
  subject?: string
  isCancelled?: boolean
  start?: { dateTime?: string; timeZone?: string }
  end?: { dateTime?: string; timeZone?: string }
}

function parseGraphWhen(w?: { dateTime?: string; timeZone?: string }): Date | null {
  if (!w?.dateTime) return null
  // Graph returns naive datetimes in the given timeZone; when timeZone is UTC
  // (the default we request via Prefer header) the string is UTC.
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(w.dateTime) ? w.dateTime : `${w.dateTime}Z`
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

/** Sync one microsoft_calendar source: window pull → upsert external_events. */
export async function syncMicrosoftSource(sourceId: string): Promise<SyncResult> {
  const base: SyncResult = { sourceId, status: 'skipped', upserted: 0, tombstoned: 0, fullResync: true }
  const ctx = await getAccessToken(sourceId)
  if (!ctx) return { ...base, message: 'microsoft not configured / revoked / dev' }
  const source = await prisma.externalSignalSource.findUnique({ where: { id: sourceId } })
  if (!source) return { ...base, status: 'error', message: 'source not found' }

  const now = Date.now()
  const startDateTime = new Date(now - PAST_WINDOW_DAYS * 86400000).toISOString()
  const endDateTime = new Date(now + FUTURE_WINDOW_DAYS * 86400000).toISOString()
  let url: string | null =
    `${GRAPH_BASE}/me/calendarview?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&$top=${PAGE_SIZE}&$select=id,iCalUId,subject,isCancelled,start,end`
  let upserted = 0

  for (let pageNo = 0; pageNo < MAX_PAGES && url; pageNo++) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${ctx.accessToken}`, Prefer: 'outlook.timezone="UTC"' },
    })
    if (!res.ok) {
      await prisma.externalSignalSource.update({ where: { id: sourceId }, data: { status: 'error' } })
      return { ...base, status: 'error', upserted, message: `graph calendarview ${res.status}` }
    }
    const json = (await res.json()) as { value?: MsEvent[]; ['@odata.nextLink']?: string }
    for (const item of json.value ?? []) {
      if (!item.id) continue
      if (item.isCancelled) {
        await prisma.externalEvent.updateMany({ where: { sourceId, externalId: item.id, isDeleted: false }, data: { isDeleted: true, updatedAt: new Date() } })
        continue
      }
      const startsAt = parseGraphWhen(item.start)
      const endsAt = parseGraphWhen(item.end)
      if (!startsAt || !endsAt) continue
      const fields = { icalUid: item.iCalUId ?? null, title: item.subject ?? null, startsAt, endsAt, isDeleted: false, updatedAt: new Date() }
      await prisma.externalEvent.upsert({
        where: { sourceId_externalId: { sourceId, externalId: item.id } },
        create: { ...fields, userId: source.userId, sourceId, externalId: item.id },
        update: fields,
      })
      upserted += 1
    }
    url = json['@odata.nextLink'] ?? null
  }

  await prisma.externalSignalSource.update({ where: { id: sourceId }, data: { lastSyncedAt: new Date(), status: 'active' } })
  return { sourceId, status: 'synced', upserted, tombstoned: 0, fullResync: true }
}

/** On-view freshness for Microsoft sources (mirrors syncStaleGoogleSources). */
export async function syncStaleMicrosoftSources(userId: string, maxAgeMs = 60_000): Promise<number> {
  if (!isMicrosoftCalendarConfigured()) return 0
  const cutoff = new Date(Date.now() - maxAgeMs)
  let sources: { id: string }[] = []
  try {
    sources = await prisma.externalSignalSource.findMany({
      where: { userId, provider: MICROSOFT_CALENDAR_PROVIDER, status: 'active', OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }] },
      select: { id: true },
    })
  } catch { return 0 }
  let synced = 0
  for (const s of sources) { try { await syncMicrosoftSource(s.id); synced++ } catch { /* best-effort */ } }
  return synced
}

// ─── Write-back (two-way) ─────────────────────────────────────────────────────

function toGraphBody(ev: NativeEventShape): Record<string, unknown> {
  return {
    subject: ev.title,
    body: ev.description ? { contentType: 'text', content: ev.description } : undefined,
    location: ev.location ? { displayName: ev.location } : undefined,
    isAllDay: ev.allDay ?? false,
    start: { dateTime: ev.startAt.toISOString(), timeZone: 'UTC' },
    end: { dateTime: ev.endAt.toISOString(), timeZone: 'UTC' },
  }
}

export async function pushEventToMicrosoft(userIdSourceId: string, ev: NativeEventShape): Promise<GoogleWriteResult> {
  const ctx = await getAccessToken(userIdSourceId)
  if (!ctx) return { ok: false, skipped: true, reason: 'microsoft_not_connected' }
  const res = await fetch(`${GRAPH_BASE}/me/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toGraphBody(ev)),
  })
  if (!res.ok) return { ok: false, skipped: false, reason: `graph_create_${res.status}` }
  const json = (await res.json()) as { id?: string }
  if (!json.id) return { ok: false, skipped: false, reason: 'graph_create_no_id' }
  return { ok: true, googleEventId: json.id, googleCalendarId: 'primary' }
}

export async function updateMicrosoftEvent(sourceId: string, eventId: string, ev: NativeEventShape): Promise<GoogleWriteResult> {
  const ctx = await getAccessToken(sourceId)
  if (!ctx) return { ok: false, skipped: true, reason: 'microsoft_not_connected' }
  const res = await fetch(`${GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toGraphBody(ev)),
  })
  if (!res.ok) return { ok: false, skipped: false, reason: `graph_update_${res.status}` }
  return { ok: true, googleEventId: eventId, googleCalendarId: 'primary' }
}

export async function deleteMicrosoftEvent(sourceId: string, eventId: string): Promise<GoogleWriteResult> {
  const ctx = await getAccessToken(sourceId)
  if (!ctx) return { ok: false, skipped: true, reason: 'microsoft_not_connected' }
  const res = await fetch(`${GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ctx.accessToken}` },
  })
  if (!res.ok && res.status !== 404) return { ok: false, skipped: false, reason: `graph_delete_${res.status}` }
  return { ok: true, googleEventId: eventId, googleCalendarId: 'primary' }
}
