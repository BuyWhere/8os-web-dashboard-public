/**
 * External calendar provider registry (Calendar v2 scaffolding).
 *
 * One plug-in shape for every ExternalSignalSource provider so Outlook/365
 * (Microsoft Graph) and Apple/CalDAV can be added later behind the SAME
 * interface Google Calendar already implements. Today only Google is wired;
 * the others are declared "coming soon" with stub connectors that no-op
 * cleanly (they never touch the network and never throw), so the Sources UI can
 * list them and the sync/write plumbing can iterate providers uniformly.
 *
 * A connector is the seam the sync engine + the two-way write path call. Google
 * fulfils this via src/lib/external/google-calendar.ts (imported lazily by the
 * routes today); the registry here is the declarative catalog + the stub
 * connectors that keep the surface consistent until each is built.
 */

export type ProviderStatus = 'active' | 'coming_soon'

export interface ProviderNativeEvent {
  title: string
  description?: string | null
  location?: string | null
  startAt: Date
  endAt: Date
  allDay?: boolean
}

export interface ProviderWriteResult {
  ok: boolean
  skipped: boolean
  externalEventId?: string
  externalCalendarId?: string
  reason?: string
}

/**
 * The common connector contract every provider will implement. Read = sync
 * upstream events into external_events (busy overlay + attribution). Write =
 * mirror a native 8os event upstream (create/update/delete). Stubs return
 * skipped:true so callers degrade to local-only cleanly.
 */
export interface CalendarConnector {
  readonly provider: string
  /** Whether this deployment can start an OAuth/connect flow right now. */
  isConfigured(): boolean
  /** Sync upstream → external_events for one source id. */
  sync(sourceId: string): Promise<{ ok: boolean; message?: string }>
  /** Mirror a native event upstream (create). */
  push(userId: string, ev: ProviderNativeEvent): Promise<ProviderWriteResult>
  /** Mirror an update upstream. */
  update(userId: string, externalEventId: string, ev: ProviderNativeEvent): Promise<ProviderWriteResult>
  /** Remove the upstream mirror. */
  remove(userId: string, externalEventId: string): Promise<ProviderWriteResult>
}

export interface ProviderCatalogEntry {
  provider: string       // stable key stored in external_signal_sources.provider
  label: string          // UI label
  status: ProviderStatus
  connectPath: string | null // OAuth/connect entry point (null until built)
  blurb: string
  icon: string
}

/** Stub connector factory — every method is a clean no-op (coming-soon). */
function stubConnector(provider: string): CalendarConnector {
  const skipped: ProviderWriteResult = { ok: false, skipped: true, reason: `${provider}_not_implemented` }
  return {
    provider,
    isConfigured: () => false,
    async sync() { return { ok: false, message: `${provider} connector not implemented yet` } },
    async push() { return skipped },
    async update() { return skipped },
    async remove() { return skipped },
  }
}

/**
 * Outlook / Microsoft 365 (Graph) — coming soon.
 * Will use the Microsoft Graph /me/events endpoints + delta queries, mirroring
 * google-calendar.ts's shape (OAuth via /api/sources/outlook/connect, tokens in
 * external_signal_sources.encrypted_tokens, sync into external_events).
 */
export const outlookConnector: CalendarConnector = stubConnector('outlook')

/**
 * Apple Calendar / CalDAV — coming soon.
 * Will speak CalDAV (REPORT/ PUT/ DELETE against the user's principal URL) with
 * app-specific-password auth stored encrypted; same external_events overlay.
 */
export const caldavConnector: CalendarConnector = stubConnector('caldav')

/** The catalog the Sources UI renders. Google is active; others coming soon. */
export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    provider: 'google_calendar',
    label: 'Google Calendar',
    status: 'active',
    connectPath: '/api/sources/google/connect',
    blurb: 'Two-way sync: your meetings flow in as busy time and alignment signal, and events you create in 8os appear in Google Calendar.',
    icon: '▦',
  },
  {
    provider: 'outlook',
    label: 'Outlook / Microsoft 365',
    status: 'coming_soon',
    connectPath: null,
    blurb: 'Microsoft 365 and Outlook.com calendars via Microsoft Graph. Coming soon.',
    icon: '◧',
  },
  {
    provider: 'caldav',
    label: 'Apple Calendar (CalDAV)',
    status: 'coming_soon',
    connectPath: null,
    blurb: 'iCloud and other CalDAV calendars. Coming soon.',
    icon: '◍',
  },
]

/** Look up a connector by provider key (stub for the not-yet-built ones). */
export function getConnector(provider: string): CalendarConnector | null {
  if (provider === 'outlook') return outlookConnector
  if (provider === 'caldav') return caldavConnector
  // google_calendar is served by src/lib/external/google-calendar.ts directly
  // (its functions predate this registry); returning null routes callers there.
  return null
}
