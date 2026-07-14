'use client'

import { useState } from 'react'

interface CalendarEvent {
  id: string
  title: string
  startAt: string
  endAt: string
  domainId?: string | null
  color?: string | null
}

interface Props {
  events: CalendarEvent[]
  /** User's IANA timezone — day bucketing + times render in the user's local time. */
  timezone?: string
  /**
   * First day of the week (0=Sun..6=Sat). Defaults to Monday (1). A shared
   * user preference helper may be wired later; read defensively, default Mon.
   */
  weekStartsOn?: number
}

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}

const DOMAIN_LABELS: Record<string, string> = {
  career: 'Career', wealth: 'Wealth', health: 'Health',
  relationships: 'Relationships', learning: 'Learning', legacy: 'Legacy',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Civil date key (YYYY-MM-DD) of an instant in `tz`. */
function dayKeyInTz(iso: string, tz?: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

/** {y,m,d,key} of "now" in `tz`. */
function todayParts(tz?: string): { y: number; m: number; d: number; key: string } {
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const [y, m, d] = key.split('-').map(Number)
  return { y, m, d, key }
}

/** The 7 civil dates of the week containing today, as {key, dayNum, dow}. */
function weekDays(tz: string | undefined, weekStartsOn: number): { key: string; dayNum: number; dow: number }[] {
  const { y, m, d } = todayParts(tz)
  // Anchor on UTC-noon of the local civil date to avoid DST/offset drift.
  const anchor = new Date(Date.UTC(y, m - 1, d, 12))
  const dow = anchor.getUTCDay()
  const back = (dow - weekStartsOn + 7) % 7
  const start = new Date(anchor)
  start.setUTCDate(start.getUTCDate() - back)
  const out: { key: string; dayNum: number; dow: number }[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(start)
    day.setUTCDate(day.getUTCDate() + i)
    const key = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')}`
    out.push({ key, dayNum: day.getUTCDate(), dow: day.getUTCDay() })
  }
  return out
}

function fmtTime(iso: string, tz?: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: tz,
  })
}

export function CalendarMini({ events, timezone, weekStartsOn = 1 }: Props) {
  const today = todayParts(timezone)
  const days = weekDays(timezone, weekStartsOn)

  const eventsByDay = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const key = dayKeyInTz(e.startAt, timezone)
    if (!eventsByDay.has(key)) eventsByDay.set(key, [])
    eventsByDay.get(key)!.push(e)
  }
  eventsByDay.forEach((list) => {
    list.sort((a: CalendarEvent, b: CalendarEvent) => +new Date(a.startAt) - +new Date(b.startAt))
  })

  // Default selection = today.
  const [selected, setSelected] = useState<string>(today.key)
  const selectedEvents = eventsByDay.get(selected) ?? []
  const selectedLabel = (() => {
    const [y, m, d] = selected.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC',
    })
  })()

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((d) => {
          const isToday = d.key === today.key
          const isSelected = d.key === selected
          const dayEvents = eventsByDay.get(d.key) ?? []

          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelected(d.key)}
              aria-pressed={isSelected}
              style={{
                textAlign: 'center', background: 'transparent', border: 'none',
                padding: 0, cursor: 'pointer', font: 'inherit',
              }}
            >
              <div style={{ color: 'var(--color-text-muted)', fontSize: 10, marginBottom: 4 }}>{DAYS[d.dow]}</div>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', margin: '0 auto',
                background: isToday ? 'var(--color-accent, var(--color-accent))' : 'transparent',
                border: isSelected && !isToday ? '2px solid var(--color-accent, var(--color-accent))' : isToday ? 'none' : '1px solid var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: isToday ? '#fff' : isSelected ? 'var(--color-accent, var(--color-accent))' : 'var(--color-text-secondary)',
                fontWeight: isToday || isSelected ? 700 : 400,
              }}>
                {d.dayNum}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, alignItems: 'center' }}>
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    title={e.title}
                    style={{
                      width: 20, height: 4, borderRadius: 2,
                      background: e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : 'var(--color-accent)') ?? 'var(--color-accent)',
                    }}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>+{dayEvents.length - 3}</div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected-day items, was a blank box; now the day's key calendar items. */}
      <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>
          {selected === today.key ? 'Today' : selectedLabel}
        </div>
        {selectedEvents.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '6px 0' }}>Nothing scheduled.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedEvents.map((e) => {
              const dot = e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : null) ?? 'var(--color-accent)'
              const domainLabel = e.domainId ? (DOMAIN_LABELS[e.domainId] ?? e.domainId) : null
              return (
                <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 6 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--color-ink, #221F1A)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 1 }}>
                      {fmtTime(e.startAt, timezone)}
                      {domainLabel ? ` · ${domainLabel}` : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
