/**
 * E-1 external-calendar ingestion — Google Calendar sync engine (backlog §4.2).
 *
 * DORMANT WITHOUT CREDENTIALS: every OAuth-touching path checks
 * `isGoogleCalendarConfigured()` (GOOGLE_CALENDAR_CLIENT_ID +
 * GOOGLE_CALENDAR_CLIENT_SECRET). When unset, connect returns
 * `{ configured: false }` and syncs no-op cleanly — the whole pipeline below
 * (tables → busy-time → attribution) still works from seeded/dev sources.
 *
 * Google APIs are called with plain `fetch` — NO googleapis SDK (hard rule:
 * no package.json changes).
 *
 * Sync design (doc §4.2):
 *  - `events.list` on the `primary` calendar with incremental `syncToken`;
 *    first sync uses a full window of −60d…+30d (singleEvents so recurring
 *    meetings expand to instances with concrete times).
 *  - Access token refreshed via refresh_token when expired; refreshed tokens
 *    are re-encrypted and stored (AES util shared with birth-moment data).
 *  - Upserts into `external_events` on UNIQUE(source_id, external_id);
 *    upstream deletions arrive as status=cancelled → tombstone `is_deleted`.
 *  - HTTP 410 GONE = syncToken expired → drop the token and full-resync.
 *  - Polling cadence (30–60 min) arrives with the Phase-C heartbeat (E-3);
 *    until then syncs run at connect time and via POST /api/sources/sync.
 */
import { prisma } from '@/lib/db/prisma'
import { encrypt, decrypt } from '@/lib/encryption'

export const GOOGLE_CALENDAR_PROVIDER = 'google_calendar'
// Read scope kept for reference; the two-way build requests the read/write
// `calendar.events` scope (superset of readonly for event data) so 8os can also
// create/update/delete events in the connected calendar. Existing readonly
// grants keep working for read-only sync — the write helpers below simply
// return `{ ok:false, reason:'insufficient_scope' }` on a 403 and never throw.
export const GOOGLE_CALENDAR_READ_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
export const GOOGLE_CALENDAR_WRITE_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
// Requested scope for new connections (read+write on events). Space-delimited.
export const GOOGLE_CALENDAR_SCOPE = GOOGLE_CALENDAR_WRITE_SCOPE

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const CALENDARS_BASE = 'https://www.googleapis.com/calendar/v3/calendars'
const EVENTS_URL = `${CALENDARS_BASE}/primary/events`

const PAST_WINDOW_DAYS = 60
const FUTURE_WINDOW_DAYS = 30
const PAGE_SIZE = 250
const MAX_PAGES = 20 // hard bound per sync run (≈5000 events)

// ─── Configuration ───────────────────────────────────────────────────────────

export function isGoogleCalendarConfigured(): boolean {
  return !!(process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET)
}

/** Registered OAuth redirect URI (overridable for staging via env). */
export function googleCalendarRedirectUri(): string {
  return process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'https://8os.ai/api/sources/google/callback'
}

/** Google consent-screen URL for the readonly-calendar scope. */
export function buildConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
    redirect_uri: googleCalendarRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: 'offline', // we need a refresh_token for background polling
    prompt: 'consent',      // force refresh_token issuance even on re-connect
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

/** Decrypted shape stored (AES-256-GCM) in external_signal_sources.encrypted_tokens. */
export interface StoredTokens {
  access_token?: string
  refresh_token?: string
  /** ms-epoch when access_token expires (derived from expires_in at store time). */
  expires_at?: number
  scope?: string
  token_type?: string
  /** Dev-seeded source (QA pipeline verification): sync is a clean no-op. */
  dev?: boolean
}

interface GoogleTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
}

async function tokenRequest(body: Record<string, string>): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  const json = (await res.json().catch(() => ({}))) as GoogleTokenResponse
  if (!res.ok) {
    throw new Error(`google token endpoint ${res.status}: ${json.error ?? ''} ${json.error_description ?? ''}`.trim())
  }
  return json
}

/** Exchange an OAuth authorization code for tokens (plain fetch, no SDK). */
export async function exchangeCodeForTokens(code: string): Promise<StoredTokens> {
  const r = await tokenRequest({
    code,
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
    redirect_uri: googleCalendarRedirectUri(),
    grant_type: 'authorization_code',
  })
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: r.expires_in ? Date.now() + r.expires_in * 1000 : undefined,
    scope: r.scope,
    token_type: r.token_type,
  }
}

/** Refresh an access token; returns the merged token set (refresh_token kept). */
async function refreshAccessToken(tokens: StoredTokens): Promise<StoredTokens> {
  if (!tokens.refresh_token) throw new Error('no refresh_token stored')
  const r = await tokenRequest({
    refresh_token: tokens.refresh_token,
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
    grant_type: 'refresh_token',
  })
  return {
    ...tokens,
    access_token: r.access_token,
    expires_at: r.expires_in ? Date.now() + r.expires_in * 1000 : undefined,
  }
}

/** Best-effort Google token revocation (used by DELETE /api/sources/:id). */
export async function revokeGoogleTokens(encryptedTokens: string): Promise<boolean> {
  try {
    const tokens = JSON.parse(decrypt(encryptedTokens)) as StoredTokens
    if (tokens.dev) return true // dev-seeded: nothing upstream to revoke
    const token = tokens.refresh_token || tokens.access_token
    if (!token) return false
    const res = await fetch(REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Sync engine ─────────────────────────────────────────────────────────────

interface GoogleEventItem {
  id?: string
  iCalUID?: string
  status?: string // confirmed | tentative | cancelled
  summary?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string; organizer?: boolean; self?: boolean }>
}

interface GoogleEventsPage {
  items?: GoogleEventItem[]
  nextPageToken?: string
  nextSyncToken?: string
}

export interface SyncResult {
  sourceId: string
  status: 'synced' | 'skipped' | 'error'
  upserted: number
  tombstoned: number
  fullResync: boolean
  message?: string
}

function parseWhen(w?: { dateTime?: string; date?: string }): Date | null {
  if (w?.dateTime) {
    const d = new Date(w.dateTime)
    return isNaN(d.getTime()) ? null : d
  }
  if (w?.date) {
    // all-day events: date-only boundaries, treated as UTC midnights
    const d = new Date(`${w.date}T00:00:00.000Z`)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

async function listEventsPage(
  accessToken: string,
  opts: { syncToken?: string | null; pageToken?: string | null },
): Promise<{ page?: GoogleEventsPage; gone?: boolean; error?: string }> {
  const params = new URLSearchParams({ maxResults: String(PAGE_SIZE), showDeleted: 'true' })
  if (opts.pageToken) {
    params.set('pageToken', opts.pageToken)
    // Google requires the original request params alongside pageToken; the
    // syncToken/window params below are re-sent for consistency.
  }
  if (opts.syncToken) {
    params.set('syncToken', opts.syncToken)
  } else {
    const now = Date.now()
    params.set('singleEvents', 'true') // expand recurrences to instances
    params.set('timeMin', new Date(now - PAST_WINDOW_DAYS * 86400000).toISOString())
    params.set('timeMax', new Date(now + FUTURE_WINDOW_DAYS * 86400000).toISOString())
  }
  const res = await fetch(`${EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 410) return { gone: true } // syncToken expired → full resync
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { error: `events.list ${res.status}: ${text.slice(0, 300)}` }
  }
  return { page: (await res.json()) as GoogleEventsPage }
}

/**
 * Sync one external_signal_sources row from Google Calendar.
 * Safe to call on any source: revoked / dev-seeded / unconfigured-env sources
 * return `skipped` without touching the network.
 */
export async function syncSource(sourceId: string): Promise<SyncResult> {
  const base: SyncResult = { sourceId, status: 'skipped', upserted: 0, tombstoned: 0, fullResync: false }

  const source = await prisma.externalSignalSource.findUnique({ where: { id: sourceId } })
  if (!source) return { ...base, status: 'error', message: 'source not found' }
  if (source.status === 'revoked') return { ...base, message: 'source is revoked' }
  if (source.provider !== GOOGLE_CALENDAR_PROVIDER) return { ...base, message: `unsupported provider ${source.provider}` }

  let tokens: StoredTokens
  try {
    tokens = JSON.parse(decrypt(source.encryptedTokens)) as StoredTokens
  } catch {
    await prisma.externalSignalSource.update({ where: { id: sourceId }, data: { status: 'error' } })
    return { ...base, status: 'error', message: 'stored tokens could not be decrypted' }
  }
  if (tokens.dev) return { ...base, message: 'dev-seeded source — no upstream calendar' }
  if (!isGoogleCalendarConfigured()) return { ...base, message: 'google oauth env not configured (dormant)' }

  // ── Valid access token (refresh when missing/expiring) ──
  let accessToken = tokens.access_token
  const expiring = !tokens.expires_at || tokens.expires_at < Date.now() + 60_000
  if (!accessToken || expiring) {
    try {
      tokens = await refreshAccessToken(tokens)
      accessToken = tokens.access_token
      await prisma.externalSignalSource.update({
        where: { id: sourceId },
        data: { encryptedTokens: encrypt(JSON.stringify(tokens)) },
      })
    } catch (err) {
      // invalid_grant = user revoked upstream / token expired for good
      await prisma.externalSignalSource.update({ where: { id: sourceId }, data: { status: 'error' } })
      return { ...base, status: 'error', message: `token refresh failed: ${err instanceof Error ? err.message : String(err)}` }
    }
  }
  if (!accessToken) {
    await prisma.externalSignalSource.update({ where: { id: sourceId }, data: { status: 'error' } })
    return { ...base, status: 'error', message: 'no access token available' }
  }

  // ── Page through events.list (incremental first, full on 410) ──
  let syncToken: string | null = source.syncToken
  let fullResync = !syncToken
  let upserted = 0
  let tombstoned = 0

  for (let attempt = 0; attempt < 2; attempt++) {
    let pageToken: string | null = null
    let nextSyncToken: string | null = null
    let gone = false

    for (let pageNo = 0; pageNo < MAX_PAGES; pageNo++) {
      const r = await listEventsPage(accessToken, { syncToken, pageToken })
      if (r.gone) { gone = true; break }
      if (r.error || !r.page) {
        await prisma.externalSignalSource.update({ where: { id: sourceId }, data: { status: 'error' } })
        return { ...base, status: 'error', upserted, tombstoned, fullResync, message: r.error ?? 'empty events page' }
      }

      for (const item of r.page.items ?? []) {
        if (!item.id) continue
        if (item.status === 'cancelled') {
          // Tombstone (doc: upstream deletion → is_deleted; cancelled payloads
          // often carry no times, so update-if-known rather than upsert).
          const res = await prisma.externalEvent.updateMany({
            where: { sourceId, externalId: item.id, isDeleted: false },
            data: { isDeleted: true, updatedAt: new Date() },
          })
          tombstoned += res.count
          continue
        }
        const startsAt = parseWhen(item.start)
        const endsAt = parseWhen(item.end)
        if (!startsAt || !endsAt) continue
        const attendees = (item.attendees ?? []).slice(0, 25).map((a) => ({
          email: a.email ?? null,
          displayName: a.displayName ?? null,
          responseStatus: a.responseStatus ?? null,
          organizer: a.organizer ?? false,
          self: a.self ?? false,
        }))
        const attendeesJson = attendees.length > 0 ? attendees : undefined
        const fields = {
          icalUid: item.iCalUID ?? null,
          title: item.summary ?? null,
          startsAt,
          endsAt,
          attendeesJson,
          isDeleted: false,
          updatedAt: new Date(),
        }
        await prisma.externalEvent.upsert({
          where: { sourceId_externalId: { sourceId, externalId: item.id } },
          create: { ...fields, userId: source.userId, sourceId, externalId: item.id },
          update: fields,
        })
        upserted += 1
      }

      nextSyncToken = r.page.nextSyncToken ?? nextSyncToken
      pageToken = r.page.nextPageToken ?? null
      if (!pageToken) break
    }

    if (gone) {
      // 410 GONE: incremental token expired — clear it and run one full pass.
      syncToken = null
      fullResync = true
      await prisma.externalSignalSource.update({ where: { id: sourceId }, data: { syncToken: null } })
      continue
    }

    await prisma.externalSignalSource.update({
      where: { id: sourceId },
      data: { syncToken: nextSyncToken ?? syncToken, lastSyncedAt: new Date(), status: 'active' },
    })
    return { sourceId, status: 'synced', upserted, tombstoned, fullResync }
  }

  await prisma.externalSignalSource.update({ where: { id: sourceId }, data: { status: 'error' } })
  return { ...base, status: 'error', upserted, tombstoned, fullResync: true, message: 'sync token expired twice in a row' }
}

/**
 * On-view freshness: sync the caller's Google sources that haven't synced in
 * the last `maxAgeMs`. Called when the user opens the Calendar/Dashboard so
 * recent upstream changes appear without waiting for a manual sync. Incremental
 * (syncToken) so it's cheap; best-effort (never throws — a Google hiccup must
 * not break page render). Returns the number of sources synced.
 */
export async function syncStaleGoogleSources(userId: string, maxAgeMs = 60_000): Promise<number> {
  if (!isGoogleCalendarConfigured()) return 0
  const cutoff = new Date(Date.now() - maxAgeMs)
  let sources: { id: string }[] = []
  try {
    sources = await prisma.externalSignalSource.findMany({
      where: {
        userId,
        provider: GOOGLE_CALENDAR_PROVIDER,
        status: 'active',
        OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }],
      },
      select: { id: true },
    })
  } catch {
    return 0
  }
  let synced = 0
  for (const s of sources) {
    try {
      await syncSource(s.id)
      synced++
    } catch {
      /* best-effort — skip a failing source, keep the page fast */
    }
  }
  return synced
}

// ─── Busy-time for the scheduler ─────────────────────────────────────────────

/**
 * Non-deleted external events overlapping [from, to), shaped as the
 * scheduler's ExistingEvent windows. Provider-agnostic: reads external_events
 * regardless of which provider ingested them. Used by every findBestSlot
 * caller so external calendars count as busy time (doc §4.2).
 */
export async function getExternalBusyWindows(
  userId: string,
  from: Date,
  to: Date,
): Promise<Array<{ startAt: Date; endAt: Date }>> {
  const rows = await prisma.externalEvent.findMany({
    where: { userId, isDeleted: false, startsAt: { lt: to }, endsAt: { gt: from } },
    select: { startsAt: true, endsAt: true },
    take: 2000,
  })
  return rows.map((r) => ({ startAt: r.startsAt, endAt: r.endsAt }))
}

// ─── Two-way write path (BUILD; dormant until creds) ─────────────────────────
//
// When a Google source is connected, native 8os events can be mirrored INTO the
// user's Google Calendar. Every entry point below is gated on
// isGoogleCalendarConfigured() + the presence of a live (non-revoked) source
// with a usable token, and returns a plain result object — it NEVER throws into
// the calendar CRUD routes. If unconfigured/unconnected it returns
// { ok:false, skipped:true } so the local write is authoritative and the API
// route succeeds regardless.
//
// Loop-avoidance: the id Google returns is stored on CalendarEvent.googleEventId
// (+ googleCalendarId). The read-sync (syncSource) writes only into
// external_events, which are a read-only overlay and are matched against native
// googleEventId at the presentation layer (page.tsx) so a pushed event is never
// shown twice. Deletes/updates from 8os target that stored id directly.

export type GoogleWriteResult =
  | { ok: true; googleEventId: string; googleCalendarId: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; reason: string }

export interface NativeEventShape {
  title: string
  description?: string | null
  location?: string | null
  startAt: Date
  endAt: Date
  allDay?: boolean
}

/**
 * Resolve a usable (refreshed) access token for a user's live Google source.
 * Returns null (never throws) when unconfigured, no source, dev-seeded, revoked,
 * or the token cannot be refreshed — every write helper degrades to a no-op.
 */
async function getWritableGoogleContext(
  userId: string,
): Promise<{ accessToken: string; sourceId: string } | null> {
  if (!isGoogleCalendarConfigured()) return null
  const source = await prisma.externalSignalSource.findFirst({
    where: { userId, provider: GOOGLE_CALENDAR_PROVIDER, status: { not: 'revoked' } },
    orderBy: { createdAt: 'desc' },
  })
  if (!source) return null

  let tokens: StoredTokens
  try {
    tokens = JSON.parse(decrypt(source.encryptedTokens)) as StoredTokens
  } catch {
    return null
  }
  if (tokens.dev) return null // dev-seeded: no upstream calendar

  let accessToken = tokens.access_token
  const expiring = !tokens.expires_at || tokens.expires_at < Date.now() + 60_000
  if (!accessToken || expiring) {
    try {
      tokens = await refreshAccessToken(tokens)
      accessToken = tokens.access_token
      await prisma.externalSignalSource.update({
        where: { id: source.id },
        data: { encryptedTokens: encrypt(JSON.stringify(tokens)) },
      })
    } catch {
      return null
    }
  }
  if (!accessToken) return null
  return { accessToken, sourceId: source.id }
}

/** Build the Google event resource body from a native 8os event. */
function toGoogleEventBody(ev: NativeEventShape): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: ev.title,
    description: ev.description ?? undefined,
    location: ev.location ?? undefined,
  }
  if (ev.allDay) {
    // All-day: date-only, exclusive end (Google convention → +1 day).
    const startDate = ev.startAt.toISOString().slice(0, 10)
    const endExclusive = new Date(ev.endAt.getTime())
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
    body.start = { date: startDate }
    body.end = { date: endExclusive.toISOString().slice(0, 10) }
  } else {
    body.start = { dateTime: ev.startAt.toISOString() }
    body.end = { dateTime: ev.endAt.toISOString() }
  }
  return body
}

/** Create the mirror of a native event in Google Calendar. */
export async function pushEventToGoogle(
  userId: string,
  ev: NativeEventShape,
  calendarId = 'primary',
): Promise<GoogleWriteResult> {
  const ctx = await getWritableGoogleContext(userId)
  if (!ctx) return { ok: false, skipped: true, reason: 'google_not_connected' }
  try {
    const res = await fetch(`${CALENDARS_BASE}/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(toGoogleEventBody(ev)),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, skipped: false, reason: `google_create_${res.status}:${text.slice(0, 200)}` }
    }
    const json = (await res.json()) as { id?: string }
    if (!json.id) return { ok: false, skipped: false, reason: 'google_create_no_id' }
    return { ok: true, googleEventId: json.id, googleCalendarId: calendarId }
  } catch (err) {
    return { ok: false, skipped: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

/** Update the mirror of a native event in Google Calendar (PATCH). */
export async function updateGoogleEvent(
  userId: string,
  googleEventId: string,
  ev: NativeEventShape,
  calendarId = 'primary',
): Promise<GoogleWriteResult> {
  const ctx = await getWritableGoogleContext(userId)
  if (!ctx) return { ok: false, skipped: true, reason: 'google_not_connected' }
  try {
    const res = await fetch(
      `${CALENDARS_BASE}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(toGoogleEventBody(ev)),
      },
    )
    if (res.status === 404 || res.status === 410) {
      // Vanished upstream — recreate so 8os stays the source of truth.
      return await pushEventToGoogle(userId, ev, calendarId)
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, skipped: false, reason: `google_update_${res.status}:${text.slice(0, 200)}` }
    }
    return { ok: true, googleEventId, googleCalendarId: calendarId }
  } catch (err) {
    return { ok: false, skipped: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

/** Delete the mirror of a native event from Google Calendar. */
export async function deleteGoogleEvent(
  userId: string,
  googleEventId: string,
  calendarId = 'primary',
): Promise<GoogleWriteResult> {
  const ctx = await getWritableGoogleContext(userId)
  if (!ctx) return { ok: false, skipped: true, reason: 'google_not_connected' }
  try {
    const res = await fetch(
      `${CALENDARS_BASE}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    )
    // 404/410 = already gone upstream — treat as success (idempotent delete).
    if (res.ok || res.status === 404 || res.status === 410 || res.status === 204) {
      return { ok: true, googleEventId, googleCalendarId: calendarId }
    }
    const text = await res.text().catch(() => '')
    return { ok: false, skipped: false, reason: `google_delete_${res.status}:${text.slice(0, 200)}` }
  } catch (err) {
    return { ok: false, skipped: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

/** True when the user has a live, writable Google source (no network call). */
export async function hasWritableGoogleSource(userId: string): Promise<boolean> {
  if (!isGoogleCalendarConfigured()) return false
  const source = await prisma.externalSignalSource.findFirst({
    where: { userId, provider: GOOGLE_CALENDAR_PROVIDER, status: { not: 'revoked' } },
    select: { id: true, encryptedTokens: true },
  })
  if (!source) return false
  try {
    const t = JSON.parse(decrypt(source.encryptedTokens)) as StoredTokens
    return !t.dev
  } catch {
    return false
  }
}
