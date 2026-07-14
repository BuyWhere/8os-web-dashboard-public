'use client'

/**
 * /settings/preferences — the Preferences tab of the unified account hub.
 *
 * Theme (light/dark/system, wired to ThemeProvider + persisted to the prefs
 * API), first-day-of-week (Monday/Sunday), and timezone (auto-detected via
 * Intl, shown for confirm/change, persisted to UserProfile.timezone). On load,
 * if no timezone is stored yet, the detected zone is auto-captured so "today"
 * math + the dashboard greeting use the right zone.
 *
 * Reads/writes /api/user/preferences. Server helpers getFirstDayOfWeek /
 * getUserPreferences (src/lib/user-prefs.ts) read the same values elsewhere.
 */

import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { SettingsTabs } from '@/components/SettingsTabs'
import { useTheme } from '@/components/ThemeProvider'
import type { ThemeChoice } from '@/lib/theme'

/**
 * Client-safe IANA zone list. Defined inline (not imported from user-time.ts)
 * so the Preferences client bundle never pulls in the prisma/pg server code
 * that user-time.ts references. The API validates the chosen zone server-side.
 */
function knownTimezones(): string[] {
  try {
    const anyIntl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    if (typeof anyIntl.supportedValuesOf === 'function') return anyIntl.supportedValuesOf('timeZone')
  } catch {
    /* fall through */
  }
  return []
}

interface PrefsResponse {
  theme: ThemeChoice
  firstDayOfWeek: 0 | 1
  timezone: string | null
  hasProfile?: boolean
}

const card: React.CSSProperties = {
  maxWidth: 640,
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
}
const h2: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  margin: '0 0 4px',
}
const sub: React.CSSProperties = { fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 14px' }
const seg: React.CSSProperties = {
  display: 'inline-flex',
  gap: 4,
  background: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: 4,
}
function segBtn(active: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: 7,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13.5,
    fontWeight: 600,
    background: active ? 'var(--color-accent)' : 'transparent',
    color: active ? '#fff' : 'var(--color-text-secondary)',
  }
}
const selectStyle: React.CSSProperties = {
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text-primary)',
  padding: '8px 10px',
  fontSize: 14,
  maxWidth: 320,
}
const btn: React.CSSProperties = {
  background: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '9px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const THEME_OPTS: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
]

function detectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export default function PreferencesPage() {
  const { choice, setTheme } = useTheme()
  const [firstDay, setFirstDay] = useState<0 | 1>(1)
  const [timezone, setTimezone] = useState<string>('')
  const [tzOptions, setTzOptions] = useState<string[]>([])
  // Detected on the CLIENT only. Initialising via useState during SSR would
  // capture the server's zone (UTC) and hydration would keep that stale value;
  // we set it in the load effect below so users see their real browser zone.
  const [detected, setDetected] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async (patch: Record<string, unknown>, note: string) => {
    setMsg(null)
    setError(null)
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      setMsg(note)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }, [])

  useEffect(() => {
    const zones = knownTimezones()
    setTzOptions(zones)
    // Detect the real browser timezone now that we are on the client.
    const det = detectedTimezone()
    setDetected(det)
    ;(async () => {
      try {
        const res = await fetch('/api/user/preferences')
        if (!res.ok) throw new Error(`Load failed (${res.status})`)
        const data: PrefsResponse = await res.json()
        setFirstDay(data.firstDayOfWeek === 0 ? 0 : 1)
        // Treat a missing OR UTC-default stored value as "unset": a fresh user
        // should see their real browser zone, not the UTC fallback.
        const stored = data.timezone && data.timezone !== "UTC" ? data.timezone : null
        if (stored) {
          setTimezone(stored)
        } else {
          // Auto-capture the detected timezone, so "today" math + the greeting
          // stop using server time. Only persists if a UserProfile row exists
          // (hasProfile); otherwise just reflect it in the UI.
          setTimezone(det)
          if (data.hasProfile && det && det !== "UTC") {
            void fetch('/api/user/preferences', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ timezone: det }),
            }).catch(() => {})
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={[]} />
      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 720 }}>
          <SettingsTabs active="/settings/preferences" />

          {msg && <p style={{ color: 'var(--color-accent)', fontSize: 13, marginTop: 0 }}>{msg}</p>}
          {error && <p style={{ color: 'var(--color-accent-2)', fontSize: 13, marginTop: 0 }}>{error}</p>}

          {/* Theme */}
          <section style={card}>
            <h2 style={h2}>Appearance</h2>
            <p style={sub}>Choose light, dark, or Auto, which follows your local time: light by day, dark after dark.</p>
            <div style={seg}>
              {THEME_OPTS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setTheme(o.value)}
                  aria-pressed={choice === o.value}
                  style={segBtn(choice === o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          {/* First day of week */}
          <section style={card}>
            <h2 style={h2}>First day of the week</h2>
            <p style={sub}>Used by the calendar and “this week” views to decide where a week begins.</p>
            <div style={seg}>
              <button
                type="button"
                onClick={() => { setFirstDay(1); void save({ firstDayOfWeek: 1 }, 'Week starts on Monday.') }}
                aria-pressed={firstDay === 1}
                style={segBtn(firstDay === 1)}
              >
                Monday
              </button>
              <button
                type="button"
                onClick={() => { setFirstDay(0); void save({ firstDayOfWeek: 0 }, 'Week starts on Sunday.') }}
                aria-pressed={firstDay === 0}
                style={segBtn(firstDay === 0)}
              >
                Sunday
              </button>
            </div>
          </section>

          {/* Timezone */}
          <section style={card}>
            <h2 style={h2}>Timezone</h2>
            <p style={sub}>
              Your timezone drives daily briefs, “today”, and greetings.
              {detected && (
                <>
                  {' '}We detected{' '}
                  <strong style={{ color: 'var(--color-text-primary)' }}>{detected}</strong>.
                </>
              )}
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {tzOptions.length > 0 ? (
                <select
                  style={selectStyle}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={loading}
                >
                  {timezone && !tzOptions.includes(timezone) && (
                    <option value={timezone}>{timezone}</option>
                  )}
                  {tzOptions.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              ) : (
                <input
                  style={selectStyle}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g. Asia/Singapore"
                  disabled={loading}
                />
              )}
              <button
                type="button"
                style={btn}
                disabled={loading || !timezone}
                onClick={() => void save({ timezone }, `Timezone set to ${timezone}.`)}
              >
                Save timezone
              </button>
              {detected && detected !== timezone && (
                <button
                  type="button"
                  style={{ ...btn, background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
                  onClick={() => { setTimezone(detected); void save({ timezone: detected }, `Timezone set to ${detected}.`) }}
                >
                  Use detected ({detected})
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
