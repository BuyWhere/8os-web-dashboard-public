/**
 * /settings/sources — connected external signal sources (E-1, backlog §4.2).
 *
 * Consent-first: the page states exactly WHAT is read (event titles, times,
 * attendees — never bodies/attachments), WHERE it is processed (Flow AI, on
 * 8os's own account) and RETENTION (rolling 180 days), per E-14. The Connect
 * Google button renders "Not configured yet" while the OAuth client env is
 * unset (dormant mode); once configured it starts the OAuth flow at
 * /api/sources/google/connect.
 *
 * NEW page on purpose — /settings/profile and /settings/channels are owned by
 * other builds and not touched. Auth: /settings(.*) is Clerk-middleware-
 * protected; data goes through /api/sources (requireAuth, userId-scoped).
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { Sidebar } from '@/components/dashboard/Sidebar'

interface SourceRow {
  id: string
  provider: string
  status: string
  lastSyncedAt: string | null
  createdAt: string
  eventCount: number
}

interface CatalogEntry {
  provider: string
  label: string
  status: 'active' | 'coming_soon'
  connectPath: string | null
  blurb: string
  icon: string
  configured: boolean
}

interface SourcesResponse {
  googleConfigured: boolean
  catalog?: CatalogEntry[]
  sources: SourceRow[]
}

const card: React.CSSProperties = {
  maxWidth: 640, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
  borderRadius: 12, padding: 20, marginBottom: 16,
}

const PROVIDER_LABEL: Record<string, string> = { google_calendar: 'Google Calendar' }

function statusBadge(status: string) {
  const map: Record<string, { bg: string; border: string; color: string; label: string }> = {
    active: { bg: '#EAF1EA', border: '#4F7A5244', color: '#4F7A52', label: 'CONNECTED' },
    error: { bg: '#FBF2E0', border: '#E4CE9A', color: '#8a6d1a', label: 'NEEDS ATTENTION' },
    revoked: { bg: '#FBEFE9', border: '#E3C4B6', color: '#B5502F', label: 'DISCONNECTED' },
  }
  const s = map[status] ?? map.error
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, borderRadius: 8, fontSize: 11, fontWeight: 700, padding: '4px 10px' }}>
      {s.label}
    </span>
  )
}

export default function SourcesSettingsPage() {
  const [data, setData] = useState<SourcesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null) // 'sync' | source id
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/sources', { cache: 'no-store' })
      if (!res.ok) throw new Error(`status ${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (e) {
      console.error('Failed to load sources:', e)
      setError('Could not load your sources. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Surface the OAuth-callback outcome (?connected=google / ?error=...)
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('connected')) {
      setNotice('Google Calendar connected — first sync has started.')
      // §4.4 funnel: `gcal_connected` — the highest-value passive signal wired.
      try { posthog.capture('gcal_connected', { provider: sp.get('connected') ?? 'google_calendar' }) } catch {}
    }
    else if (sp.get('error')) setNotice(`Connection failed: ${sp.get('error')}. Try again.`)
  }, [load])

  async function syncNow() {
    setBusy('sync')
    try {
      const res = await fetch('/api/sources/sync', { method: 'POST' })
      const j = await res.json().catch(() => null)
      setNotice(res.ok ? `Sync finished (${j?.synced ?? 0} source${j?.synced === 1 ? '' : 's'} updated).` : 'Sync failed — try again in a minute.')
      await load()
    } finally {
      setBusy(null)
    }
  }

  async function disconnect(id: string) {
    if (!window.confirm('Disconnect this calendar? 8os stops reading it immediately.')) return
    setBusy(id)
    try {
      await fetch(`/api/sources/${id}`, { method: 'DELETE' })
      await load()
    } finally {
      setBusy(null)
    }
  }

  // E-14: disconnect AND purge everything derived from this source — the
  // synced events, the alignment attributions computed from them, and the
  // affected attention-ledger days (rebuilt from what remains on the next
  // alignment run).
  async function purgeDisconnect(id: string) {
    if (!window.confirm(
      'Disconnect & delete data?\n\n8os stops reading this calendar immediately AND permanently deletes: all events synced from it, the goal-alignment attributions derived from those events, and the affected attention-ledger days. This cannot be undone.'
    )) return
    setBusy(id)
    try {
      const res = await fetch(`/api/sources/${id}?purge=1`, { method: 'DELETE' })
      const j = await res.json().catch(() => null)
      setNotice(res.ok
        ? `Source disconnected and its data deleted (${j?.purged?.events ?? 0} events, ${j?.purged?.attributions ?? 0} attributions).`
        : 'Delete failed — try again in a minute.')
      await load()
    } finally {
      setBusy(null)
    }
  }

  const googleSources = (data?.sources ?? []).filter((s) => s.provider === 'google_calendar')
  const hasActiveGoogle = googleSources.some((s) => s.status !== 'revoked')

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={[]} />

      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 24, maxWidth: 640 }}>
          <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>Sources</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Let real life flow into 8os — no manual entry
          </p>
        </div>

        {error && (
          <div style={{ maxWidth: 640, background: '#FBEFE9', border: '1px solid #E3C4B6', borderRadius: 8, color: '#B5502F', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {notice && (
          <div style={{ maxWidth: 640, background: '#F4EFE2', border: '1px solid #E0D3B4', borderRadius: 8, color: 'var(--color-text-secondary)', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            {notice}
          </div>
        )}

        {/* Consent copy — exactly what is read, where processed, retention (E-14) */}
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>What 8os reads — and what it never touches</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
            <li><b style={{ color: 'var(--color-text-primary)' }}>Read:</b> event titles, start/end times, and attendee names/emails from your primary calendar. Nothing else — no event descriptions or attachments, no emails, no documents.</li>
            <li><b style={{ color: 'var(--color-text-primary)' }}>Access is read-only.</b> 8os never creates, edits or deletes events in your Google Calendar.</li>
            <li><b style={{ color: 'var(--color-text-primary)' }}>Processed by:</b> Flow AI on 8os&apos;s own account, solely to attribute your attention to your goals. Your calendar data is never used to train models and never sold or shared.</li>
            <li><b style={{ color: 'var(--color-text-primary)' }}>Retention:</b> a rolling 180 days of events. Older entries are dropped; disconnecting stops all reading immediately.</li>
          </ul>
        </div>

        {/* Google Calendar */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>▦</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Google Calendar</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
                Two-way sync: your meetings become alignment signal and busy time, and events you create in 8os appear in your Google Calendar.
              </div>
            </div>
            {loading ? (
              <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>…</span>
            ) : !data?.googleConfigured && !hasActiveGoogle ? (
              <span style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: 8, fontSize: 11, fontWeight: 700, padding: '4px 10px' }}>
                NOT CONFIGURED YET
              </span>
            ) : null}
          </div>

          {!loading && (
            <div style={{ marginTop: 14 }}>
              {googleSources.length === 0 && (
                data?.googleConfigured ? (
                  <a
                    href="/api/sources/google/connect"
                    style={{ display: 'inline-block', background: 'var(--color-accent)', color: '#FFFFFF', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                  >
                    Connect Google Calendar
                  </a>
                ) : (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                    Google Calendar isn&apos;t configured on this deployment yet — the connect button appears here the moment it is.
                  </div>
                )
              )}

              {googleSources.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{PROVIDER_LABEL[s.provider] ?? s.provider}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 2 }}>
                      {s.eventCount} event{s.eventCount === 1 ? '' : 's'} synced
                      {s.lastSyncedAt ? ` · last sync ${new Date(s.lastSyncedAt).toLocaleString()}` : ' · not synced yet'}
                    </div>
                  </div>
                  {statusBadge(s.status)}
                  {s.status !== 'revoked' && (
                    <button
                      onClick={() => disconnect(s.id)}
                      disabled={busy === s.id}
                      style={{ background: 'transparent', border: '1px solid #E3C4B6', color: '#B5502F', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {busy === s.id ? '…' : 'Disconnect'}
                    </button>
                  )}
                  <button
                    onClick={() => purgeDisconnect(s.id)}
                    disabled={busy === s.id}
                    title="Disconnect and permanently delete this source's synced events and derived alignment data"
                    style={{ background: '#FBEFE9', border: '1px solid #E3C4B6', color: '#B5502F', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {busy === s.id ? '…' : s.status === 'revoked' ? 'Delete synced data' : 'Disconnect & delete data'}
                  </button>
                </div>
              ))}

              {hasActiveGoogle && (
                <div style={{ marginTop: 14 }}>
                  <button
                    onClick={syncNow}
                    disabled={busy === 'sync'}
                    style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-strong)', color: 'var(--color-accent)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {busy === 'sync' ? 'Syncing…' : 'Sync now'}
                  </button>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12, marginLeft: 10 }}>Automatic background sync lands with the agent heartbeat.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Other calendars — scaffolded behind the same plug-in (coming soon) */}
        {(data?.catalog ?? []).filter((p) => p.status === 'coming_soon').map((p) => (
          <div key={p.provider} style={{ ...card, opacity: 0.75 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{p.label}</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>{p.blurb}</div>
              </div>
              <span style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', borderRadius: 8, fontSize: 11, fontWeight: 700, padding: '4px 10px' }}>
                COMING SOON
              </span>
            </div>
          </div>
        ))}

        <div style={{ maxWidth: 640, color: 'var(--color-text-muted)', fontSize: 12, lineHeight: 1.6 }}>
          External events count as busy time for auto-scheduling and feed your alignment verdicts. Google Calendar is two-way; other providers are read-only until their connectors ship.
        </div>
      </main>
    </div>
  )
}
