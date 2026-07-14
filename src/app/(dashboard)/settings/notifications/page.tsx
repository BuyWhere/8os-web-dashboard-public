/**
 * /settings/notifications — notification governance (E-13, backlog §3.6).
 *
 * Lets the user set: daily-brief hour, shutdown hour, quiet hours (default
 * 22:00–07:30), the global daily proactive cap (default 3), and a one-tap
 * "snooze a week" (travel / quiet week). Writes /api/notifications/prefs, which
 * the heartbeat tick + governor read.
 *
 * NEW page — /settings/{profile,channels,sources} are owned by other builds and
 * untouched. Auth: /settings(.*) is Clerk-middleware-protected.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'

interface PrefsResponse {
  prefs: {
    daily_brief: { enabled: boolean; hour: number }
    daily_shutdown: { enabled: boolean; hour: number }
  }
  quietStart: string
  quietEnd: string
  dailyCap: number
  // Phase-E (E-10 Focus Mode + weekly cadence)
  focusMode?: boolean
  weeklyHour?: number
  weeklyEnabled?: boolean
  snoozeUntil: string | null
  snoozed: boolean
}

const card: React.CSSProperties = {
  maxWidth: 640, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
  borderRadius: 12, padding: 20, marginBottom: 16,
}
const label: React.CSSProperties = { display: 'block', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }
const input: React.CSSProperties = {
  background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8,
  color: 'var(--color-text-primary)', padding: '8px 10px', fontSize: 14, width: 120,
}
const btn: React.CSSProperties = {
  background: 'var(--color-accent)', color: '#FFFFFF', border: 'none', borderRadius: 8,
  padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const hours = Array.from({ length: 24 }, (_, i) => i)

function HourSelect({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  return (
    <select style={input} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {hours.map((h) => (
        <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
      ))}
    </select>
  )
}

export default function NotificationsSettingsPage() {
  const [data, setData] = useState<PrefsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications/prefs')
      if (!res.ok) throw new Error(`Load failed (${res.status})`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const patch = useCallback((p: Partial<Record<string, unknown>>) => {
    setData((d) => {
      if (!d) return d
      const next = { ...d, prefs: { ...d.prefs } }
      if ('briefHour' in p) next.prefs.daily_brief = { ...next.prefs.daily_brief, hour: p.briefHour as number }
      if ('briefEnabled' in p) next.prefs.daily_brief = { ...next.prefs.daily_brief, enabled: p.briefEnabled as boolean }
      if ('shutdownHour' in p) next.prefs.daily_shutdown = { ...next.prefs.daily_shutdown, hour: p.shutdownHour as number }
      if ('shutdownEnabled' in p) next.prefs.daily_shutdown = { ...next.prefs.daily_shutdown, enabled: p.shutdownEnabled as boolean }
      if ('quietStart' in p) next.quietStart = p.quietStart as string
      if ('quietEnd' in p) next.quietEnd = p.quietEnd as string
      if ('dailyCap' in p) next.dailyCap = p.dailyCap as number
      if ('focusMode' in p) next.focusMode = p.focusMode as boolean
      if ('weeklyHour' in p) next.weeklyHour = p.weeklyHour as number
      if ('weeklyEnabled' in p) next.weeklyEnabled = p.weeklyEnabled as boolean
      return next
    })
  }, [])

  const save = useCallback(async (extra: Record<string, unknown> = {}) => {
    if (!data) return
    setSaving(true); setMsg(null); setError(null)
    try {
      const res = await fetch('/api/notifications/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefHour: data.prefs.daily_brief.hour,
          briefEnabled: data.prefs.daily_brief.enabled,
          shutdownHour: data.prefs.daily_shutdown.hour,
          shutdownEnabled: data.prefs.daily_shutdown.enabled,
          quietStart: data.quietStart,
          quietEnd: data.quietEnd,
          dailyCap: data.dailyCap,
          focusMode: data.focusMode !== false,
          weeklyHour: data.weeklyHour ?? 18,
          weeklyEnabled: data.weeklyEnabled !== false,
          ...extra,
        }),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      setData(await res.json())
      setMsg('Saved.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [data])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px 40px', color: 'var(--color-text-primary)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-serif), Georgia, serif' }}>Notifications</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>
          8os only reaches out proactively within these rules. Reactive replies (when you message it) are never governed.
        </p>

        {loading && <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>}
        {error && <p style={{ color: '#B5502F' }}>{error}</p>}

        {data && (
          <>
            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Daily rituals</h2>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <span style={label}>Morning brief</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 }}>
                    <input type="checkbox" checked={data.prefs.daily_brief.enabled}
                      onChange={(e) => patch({ briefEnabled: e.target.checked })} /> Enabled
                  </label>
                  <HourSelect value={data.prefs.daily_brief.hour} onChange={(h) => patch({ briefHour: h })} />
                </div>
                <div>
                  <span style={label}>Evening shutdown</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 }}>
                    <input type="checkbox" checked={data.prefs.daily_shutdown.enabled}
                      onChange={(e) => patch({ shutdownEnabled: e.target.checked })} /> Enabled
                  </label>
                  <HourSelect value={data.prefs.daily_shutdown.hour} onChange={(h) => patch({ shutdownHour: h })} />
                </div>
              </div>
            </div>

            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Quiet hours & cap</h2>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 8 }}>
                <div>
                  <span style={label}>Quiet from</span>
                  <input style={input} type="time" value={data.quietStart}
                    onChange={(e) => patch({ quietStart: e.target.value })} />
                </div>
                <div>
                  <span style={label}>Quiet until</span>
                  <input style={input} type="time" value={data.quietEnd}
                    onChange={(e) => patch({ quietEnd: e.target.value })} />
                </div>
                <div>
                  <span style={label}>Max proactive / day</span>
                  <input style={input} type="number" min={0} max={20} value={data.dailyCap}
                    onChange={(e) => patch({ dailyCap: Number(e.target.value) })} />
                </div>
              </div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                No proactive messages are sent inside quiet hours (your local time), and never more than the cap per day.
              </p>
            </div>

            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Quiet week</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 12 }}>
                {data.snoozed
                  ? `Snoozed until ${new Date(data.snoozeUntil as string).toLocaleString()}. No proactive messages until then.`
                  : 'Traveling or need a break? Pause all proactive messages for 7 days.'}
              </p>
              <button style={{ ...btn, background: data.snoozed ? 'var(--color-bg-primary)' : 'var(--color-accent)', color: data.snoozed ? 'var(--color-text-secondary)' : '#FFFFFF' }}
                disabled={saving}
                onClick={() => save({ snooze: !data.snoozed })}>
                {data.snoozed ? 'Resume now' : 'Snooze for a week'}
              </button>
            </div>

            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Weekly review</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 12 }}>
                Your Sunday-evening review of the week + the week ahead, framed by your solar month.
              </p>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={data.weeklyEnabled !== false}
                    onChange={(e) => patch({ weeklyEnabled: e.target.checked })} /> Enabled
                </label>
                <div>
                  <span style={label}>Sunday hour</span>
                  <HourSelect value={data.weeklyHour ?? 18} onChange={(h) => patch({ weeklyHour: h })} />
                </div>
              </div>
            </div>

            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Focus Mode</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 12 }}>
                Focus Mode keeps you to 3 active goals at a time — a focus philosophy, not a paywall.
                Turn it off to hold more active goals at once.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={data.focusMode !== false}
                  onChange={(e) => patch({ focusMode: e.target.checked })} />
                Limit me to 3 active goals (recommended)
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button style={btn} disabled={saving} onClick={() => save()}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {msg && <span style={{ color: '#4F7A52', fontSize: 13 }}>{msg}</span>}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
