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
export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

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
