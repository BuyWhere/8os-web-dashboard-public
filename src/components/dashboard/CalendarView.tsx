'use client'

/**
 * CalendarView (Calendar v2) — a real calendar surface.
 *
 *  · 15-minute grid. Every hour is 4 rows; drag-to-move and drag-to-resize snap
 *    to 15-minute increments. Click (or click-drag) an empty slot to create.
 *  · Full CRUD via an event detail panel: title, start/end, all-day, notes,
 *    location, a GOAL link (goal picker → domain colour/label on the event),
 *    colour, and a simple recurrence (none/daily/weekly/biweekly/monthly).
 *  · Week / Day / Month views with Today + prev/next.
 *  · External (Google/Cal.diy) events show as a read-only busy overlay.
 *  · Warm-editorial theme via CSS vars (light/dark aware).
 *
 * Recurring instances are expanded server-side; opening one for edit targets the
 * underlying master (its base id). External/read-only events open a view-only
 * panel. Mutations hit /api/calendar/events(/[id]) then refresh the route.
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type EnergyLevel = 'green' | 'yellow' | 'red'
// `days:0,3,5` = custom weekly-by-weekday (0=Sun..6=Sat), Motion-style.
type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | `days:${string}`

interface CalendarEvent {
  id: string
  title: string
  description: string
  startAt: string
  endAt: string
  allDay: boolean
  domainId: string | null
  color: string | null
  location: string | null
  goalId: string | null
  recurrenceRule: RecurrenceRule
  recurrenceUntil: string | null
  googleEventId: string | null
  external: boolean
  readOnly: boolean
  task: {
    id: string; name: string; status: string; priority: string
    energyRequired: string; duration: number
  } | null
}

interface GoalOption { id: string; name: string; domainId: string }

interface UnscheduledTask {
  id: string; name: string; duration: number
  priority: string; energyRequired: string; domainId: string | null
}

interface Props {
  events: CalendarEvent[]
  goals: GoalOption[]
  unscheduledTasks: UnscheduledTask[]
  energyMap: Record<number, EnergyLevel> | null
  /** 0 = Sunday, 1 = Monday. Mirrors UserSettings.firstDayOfWeek. */
  firstDayOfWeek?: 0 | 1
  /** Visible day-window on the day/week grid (hours, 0–24). Default 6–24. */
  dayStartHour?: number
  dayEndHour?: number
}

type CalView = 'day' | 'week' | 'month'

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}

// Fixed hex hues: an alpha suffix is appended (c + '22') for tinted backgrounds,
// which is invalid on a CSS var(), so these must stay literal hex.
const EVENT_COLORS = ['#B08637', '#6366f1', '#22c55e', '#ec4899', '#3b82f6', '#8b5cf6', '#f59e0b', '#7A3B2E']

// WCAG AA (≥4.5:1) dark text for each event colour — covers all 8 EVENT_COLORS
// plus domain-derived hues so event titles are legible on tinted backgrounds.
// Dark text on the light (color+'22') event tint — for LIGHT mode (WCAG AA).
const EVENT_TEXT_COLORS: Record<string, string> = {
  '#B08637': '#3a1f00', // dark brown on olive
  '#6366f1': '#1e1b4b', // dark indigo on purple
  '#22c55e': '#14532d', // dark green on green
  '#ec4899': '#831843', // dark pink on pink
  '#3b82f6': '#1e3a8a', // dark blue on blue
  '#8b5cf6': '#3b0764', // dark violet on violet
  '#f59e0b': '#78350f', // dark amber on amber
  '#7A3B2E': '#450a0a', // dark red on brown-red
}
/** LIGHT-mode text colour for an event's colour (WCAG on the color+'22' tint).
 *  DARK mode is handled purely in CSS (globals.css `[data-theme='dark'] .cal-event-text`)
 *  — do NOT detect the theme in JS here: the page is server-rendered without a
 *  theme and React does not patch mismatched inline styles on hydration, which is
 *  exactly how the invisible dark-on-dark text bug happened. */
function eventTextColor(color: string): string {
  return EVENT_TEXT_COLORS[color] ?? color
}

/** Dark ink text for use on gold/accent backgrounds (WCAG AA on both #B08637 and #C79A48). */
const DARK_ON_ACCENT = '#221F1A'

const ENERGY_BG: Record<EnergyLevel, string> = {
  green: 'rgba(34,197,94,0.06)',
  yellow: 'rgba(245,158,11,0.06)',
  red: 'rgba(239,68,68,0.03)',
}

const DEFAULT_ENERGY: Record<number, EnergyLevel> = Object.fromEntries(
  Array.from({ length: 24 }, (_, i) => {
    if (i >= 9 && i <= 11) return [i, 'green' as EnergyLevel]
    if (i >= 14 && i <= 16) return [i, 'green' as EnergyLevel]
    if ((i >= 6 && i <= 8) || (i >= 13 && i <= 17)) return [i, 'yellow' as EnergyLevel]
    return [i, 'red' as EnergyLevel]
  }),
)

// ── 15-minute grid geometry ──────────────────────────────────────────────────
const SLOT_MIN = 15                 // snapping increment (minutes)
const SLOTS_PER_HOUR = 60 / SLOT_MIN
const SLOT_PX = 15                  // px per 15-min slot → 60px/hour
const HOUR_PX = SLOT_PX * SLOTS_PER_HOUR
// The visible day window is user-configurable (Settings → Preferences → "Show hours").
// These are module-level LET values that CalendarView sets from props at the top of
// its render, so every helper + sub-component reads the current window without prop
// threading. Defaults = 6am–midnight.
let DAY_START_HOUR = 6
let DAY_END_HOUR = 24
let HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => i + DAY_START_HOUR)
let GRID_HEIGHT = HOURS.length * HOUR_PX
function setDayWindow(start: number, end: number) {
  const s = Math.max(0, Math.min(23, Math.round(start)))
  const e = Math.max(s + 1, Math.min(24, Math.round(end)))
  if (s === DAY_START_HOUR && e === DAY_END_HOUR) return
  DAY_START_HOUR = s
  DAY_END_HOUR = e
  HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => i + DAY_START_HOUR)
  GRID_HEIGHT = HOURS.length * HOUR_PX
}

function pxPerMinute() { return HOUR_PX / 60 }
function snapMinutes(min: number) { return Math.round(min / SLOT_MIN) * SLOT_MIN }

function formatHour(h: number): string {
  const ampm = h >= 12 && h < 24 ? 'pm' : 'am'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${ampm}`
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function toLocalInput(iso: string): string {
  // yyyy-MM-ddThh:mm for <input type="datetime-local"> (local tz)
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60000)
  return local.toISOString().slice(0, 16)
}
function fromLocalInput(v: string): Date { return new Date(v) }

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDays(around: Date, firstDay: number): Date[] {
  const start = new Date(around)
  const dow = start.getDay()
  const diff = (dow - firstDay + 7) % 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d
  })
}

function getMonthDays(year: number, month: number, firstDay: number): Date[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = first.getDay()
  const padStart = (startDow - firstDay + 7) % 7
  const days: Date[] = []
  for (let i = padStart; i > 0; i--) { const d = new Date(first); d.setDate(d.getDate() - i); days.push(d) }
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) { const d = new Date(last); d.setDate(d.getDate() + i); days.push(d) }
  return days
}

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const key = dayKey(day)
  return events.filter((e) => !e.allDay && dayKey(new Date(e.startAt)) === key)
}
function allDayForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const key = dayKey(day)
  return events.filter((e) => e.allDay && dayKey(new Date(e.startAt)) === key)
}

function eventTop(event: CalendarEvent): number {
  const start = new Date(event.startAt)
  const minutesFromStart = (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes()
  return minutesFromStart * pxPerMinute()
}
function eventHeight(event: CalendarEvent): number {
  const dur = (new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60000
  return Math.max(dur * pxPerMinute(), SLOT_PX)
}

function eventColor(e: CalendarEvent): string {
  return e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : null) ?? '#B08637'
}

/** The editable base id for an expanded recurring instance ("id:date" → "id"). */
function baseId(id: string): string {
  const i = id.indexOf(':')
  return i === -1 ? id : id.slice(0, i)
}

/**
 * Build a client CalendarEvent for an optimistic insert after a create/edit.
 * Prefers the saved record returned by the API (authoritative id/fields) and
 * falls back to the in-panel form values. Native, editable, non-external — the
 * subsequent router.refresh() reconciles anything derived server-side (Google
 * push-back id, recurrence expansion, resolved title/domain).
 */
function normalizeSaved(
  data: Record<string, unknown> | null,
  form: EditingEvent,
): CalendarEvent {
  const rec = data && typeof data === 'object' ? data : {}
  const asStr = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback)
  const asIso = (v: unknown, fallback: string) => {
    if (typeof v === 'string') { const d = new Date(v); if (!isNaN(d.getTime())) return d.toISOString() }
    return fallback
  }
  return {
    id: asStr(rec.id, form.id ?? `local-${Date.now()}`),
    title: asStr(rec.title, form.title.trim() || 'New event'),
    description: asStr(rec.description, form.description),
    startAt: asIso(rec.startAt, form.startAt),
    endAt: asIso(rec.endAt, form.endAt),
    allDay: typeof rec.allDay === 'boolean' ? rec.allDay : form.allDay,
    domainId: typeof rec.domainId === 'string' ? rec.domainId : null,
    color: typeof rec.color === 'string' ? rec.color : form.color,
    location: typeof rec.location === 'string' ? rec.location : (form.location || null),
    goalId: typeof rec.goalId === 'string' ? rec.goalId : form.goalId,
    recurrenceRule: (asStr(rec.recurrenceRule, form.recurrenceRule) as RecurrenceRule),
    recurrenceUntil: typeof rec.recurrenceUntil === 'string' ? rec.recurrenceUntil : form.recurrenceUntil,
    googleEventId: typeof rec.googleEventId === 'string' ? rec.googleEventId : null,
    external: false,
    readOnly: false,
    task: null,
  }
}

// ─── Root ────────────────────────────────────────────────────────────────────

export function CalendarView({ events: serverEvents, goals, unscheduledTasks, energyMap, firstDayOfWeek = 1, dayStartHour = 6, dayEndHour = 24 }: Props) {
  // Apply the user's visible window before anything renders (module-level; single
  // instance). All grid helpers + sub-components then read the current HOURS/window.
  setDayWindow(dayStartHour, dayEndHour)
  const router = useRouter()
  const [view, setView] = useState<CalView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  // Mobile: stack the layout (calendar over unscheduled) and default to the
  // day view — a 7-column week grid is unusable at phone width.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = (matches: boolean) => {
      setIsMobile(matches)
      if (matches) setView((v) => (v === 'week' ? 'day' : v))
    }
    apply(mq.matches)
    const onChange = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  const [scheduling, setScheduling] = useState<string | null>(null)
  const [schedulingAll, setSchedulingAll] = useState(false)
  const [schedulingResult, setSchedulingResult] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingEvent | null>(null)
  const firstDay = firstDayOfWeek === 0 ? 0 : 1

  // ── Bug fix (week-view stale-render): the calendar renders from a *client*
  //    events state seeded from the server snapshot. Every view (day/week/month)
  //    reads this same array, so an optimistic insert/update/delete after a
  //    mutation re-renders ALL views immediately — no manual navigation/refresh.
  //    We still call router.refresh() to reconcile with the server (recurrence
  //    expansion, Google push-back, resolved title/domain), and when the fresh
  //    server snapshot arrives we adopt it as the new baseline.
  const [events, setEvents] = useState<CalendarEvent[]>(serverEvents)
  useEffect(() => { setEvents(serverEvents) }, [serverEvents])

  // Optimistically add/replace/remove an event in the shared state, then ask
  // the server to reconcile. Keyed on base id so an edit replaces its instance.
  const applyLocal = useCallback((next: CalendarEvent | null, removeId?: string) => {
    setEvents((cur) => {
      if (removeId) return cur.filter((e) => baseId(e.id) !== baseId(removeId))
      if (!next) return cur
      const withoutOld = cur.filter((e) => baseId(e.id) !== baseId(next.id))
      return [...withoutOld, next]
    })
    router.refresh()
  }, [router])

  // ── Google Calendar connection status (Bug fix: give the Calendar page a way
  //    to actually connect a calendar). We ask /api/sources whether the user has
  //    an active Google source and whether the Google OAuth client is even
  //    configured. Until we know, `sourceState` is null and we render nothing
  //    (no layout flash / no false "connect" prompt).
  const [sourceState, setSourceState] = useState<{
    connected: boolean
    googleConfigured: boolean
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/sources', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const connected = Array.isArray(data.sources)
          && data.sources.some(
            (s: { provider?: string; status?: string }) =>
              s.provider === 'google_calendar' && s.status === 'active',
          )
        setSourceState({ connected, googleConfigured: !!data.googleConfigured })
      } catch {
        /* network hiccup — leave banner hidden rather than show a wrong state */
      }
    })()
    return () => { cancelled = true }
  }, [])

  const energy = energyMap ?? DEFAULT_ENERGY
  const weekDays = useMemo(() => getWeekDays(currentDate, firstDay), [currentDate, firstDay])
  const monthDays = useMemo(() => getMonthDays(currentDate.getFullYear(), currentDate.getMonth(), firstDay), [currentDate, firstDay])
  const todayKey = dayKey(new Date())

  const goalById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals])

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  async function autoSchedule(taskId: string) {
    setScheduling(taskId); setSchedulingResult(null)
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      const data = await res.json()
      if (res.ok) {
        setSchedulingResult(`Scheduled: ${new Date(data.slot.startAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`)
        // Soft-reconcile so the new event and the shrunken unscheduled list
        // re-render across every view without a hard page reload.
        setTimeout(() => router.refresh(), 800)
      } else setSchedulingResult(data.error ?? 'Could not find a slot')
    } catch { setSchedulingResult('Scheduling failed') }
    finally { setScheduling(null) }
  }

  // Bug fix: replace ~10 identical unlabeled "⚡ Auto-schedule" buttons with one
  // primary "Auto-schedule all" action (plus a compact per-task button under
  // each named task). Schedules each task sequentially; stops on the first that
  // can't be placed and reports how many landed, then soft-reconciles once.
  async function autoScheduleAll() {
    if (schedulingAll) return
    setSchedulingAll(true); setSchedulingResult(null)
    let ok = 0
    let firstError: string | null = null
    for (const t of unscheduledTasks) {
      setScheduling(t.id)
      try {
        const res = await fetch('/api/schedule', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: t.id }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) ok++
        else if (!firstError) firstError = data.error ?? 'Could not find a slot'
      } catch { if (!firstError) firstError = 'Scheduling failed' }
    }
    setScheduling(null); setSchedulingAll(false)
    setSchedulingResult(
      ok > 0
        ? `Scheduled ${ok} task${ok === 1 ? '' : 's'}${firstError ? ` · ${firstError}` : ''}`
        : (firstError ?? 'Nothing scheduled'),
    )
    setTimeout(() => router.refresh(), 800)
  }

  // Open the detail panel to CREATE at a given start (snapped) for `mins`.
  function openCreate(start: Date, mins = 60) {
    const s = new Date(start)
    s.setMinutes(snapMinutes(s.getMinutes()), 0, 0)
    const e = new Date(s.getTime() + mins * 60000)
    setEditing({
      mode: 'create', id: null, title: '', description: '', location: '',
      startAt: s.toISOString(), endAt: e.toISOString(), allDay: false,
      color: null, goalId: null, recurrenceRule: 'none', recurrenceUntil: null,
      readOnly: false,
    })
  }

  /** All-day row shortcut: create an all-day event on `day` (panel opens pre-set). */
  function openCreateAllDay(day: Date) {
    const s = new Date(day); s.setHours(9, 0, 0, 0)
    const e = new Date(s.getTime() + 60 * 60000)
    setEditing({
      mode: 'create', id: null, title: '', description: '', location: '',
      startAt: s.toISOString(), endAt: e.toISOString(), allDay: true,
      color: null, goalId: null, recurrenceRule: 'none', recurrenceUntil: null,
      readOnly: false,
    })
  }

  // Open the detail panel to EDIT (or view read-only) an existing event.
  function openEvent(e: CalendarEvent) {
    setEditing({
      mode: e.readOnly ? 'view' : 'edit',
      id: baseId(e.id),
      title: e.title, description: e.description, location: e.location ?? '',
      startAt: e.startAt, endAt: e.endAt, allDay: e.allDay,
      color: e.color, goalId: e.goalId, recurrenceRule: e.recurrenceRule,
      recurrenceUntil: e.recurrenceUntil, readOnly: e.readOnly, external: e.external,
    })
  }

  // Persist a move/resize immediately (drag interactions). Recurring & external
  // events aren't dragged (guarded at the drag layer). Optimistically move the
  // event in the shared state so the grid re-renders at the new time at once.
  const patchTimes = useCallback(async (id: string, start: Date, end: Date) => {
    setEvents((cur) => cur.map((e) => (
      baseId(e.id) === baseId(id)
        ? { ...e, startAt: start.toISOString(), endAt: end.toISOString() }
        : e
    )))
    try {
      await fetch(`/api/calendar/events/${baseId(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: start.toISOString(), endAt: end.toISOString() }),
      })
      router.refresh()
    } catch { console.error('move/resize failed'); router.refresh() }
  }, [])

  const headerTitle = view === 'month'
    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: isMobile ? '10px 12px' : '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12 }}>
            <button onClick={() => setCurrentDate(new Date())} style={btnStyle}>Today</button>
            <button onClick={() => navigate(-1)} style={btnStyle} aria-label="Previous">◀</button>
            <button onClick={() => navigate(1)} style={btnStyle} aria-label="Next">▶</button>
            {/* Jump-to-date: the header title doubles as a native date picker. */}
            <label title="Jump to date" style={{ position: 'relative', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 16, fontFamily: 'var(--font-serif), Fraunces, Georgia, serif' }}>{headerTitle} ▾</span>
              <input
                type="date"
                aria-label="Jump to date"
                value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split('-').map(Number)
                  if (y && m && d) setCurrentDate(new Date(y, m - 1, d))
                }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => openCreate(defaultCreateStart(currentDate, view))}
              style={{ ...btnStyle, background: 'var(--color-accent)', color: DARK_ON_ACCENT, border: 'none', fontWeight: 600 }}
            >
              + New event
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['day', 'week', 'month'] as CalView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    ...btnStyle,
                    background: view === v ? 'var(--color-accent)' : 'var(--color-bg-primary)',
                    color: view === v ? DARK_ON_ACCENT : 'var(--color-text-secondary)',
                    textTransform: 'capitalize',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Connect-a-calendar affordance. When no active Google source is
            connected, show a clear prompt that starts the connect flow (or
            points to /settings/sources if the OAuth client isn't configured
            yet). When a source IS connected, show a compact "connected · Manage"
            line instead so the calendar page always has a visible entry point. */}
        {sourceState && !sourceState.connected && (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, flexWrap: 'wrap',
              padding: '12px 24px', flexShrink: 0,
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden="true">📅</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Connect your Google Calendar
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  See your existing events here and keep 8os in sync.
                </div>
              </div>
            </div>
            {sourceState.googleConfigured ? (
              <a
                href="/api/sources/google/connect"
                style={{
                  flexShrink: 0,
                  padding: '8px 14px', borderRadius: 8,
                  background: 'var(--color-accent)', color: DARK_ON_ACCENT,
                  fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}
              >
                Connect Google Calendar
              </a>
            ) : (
              <a
                href="/settings/sources"
                style={{
                  flexShrink: 0,
                  padding: '8px 14px', borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}
              >
                Set up in Sources
              </a>
            )}
          </div>
        )}
        {sourceState && sourceState.connected && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 24px', flexShrink: 0,
              borderBottom: '1px solid var(--color-border)',
              fontSize: 12.5, color: 'var(--color-text-muted)',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4F7A52', flexShrink: 0 }} aria-hidden="true" />
            <span>Google Calendar connected</span>
            <span aria-hidden="true">·</span>
            <a href="/settings/sources" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
              Manage
            </a>
          </div>
        )}

        {/* Grid — mobile: keep content off the viewport edge */}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '0 4px' : undefined }}>
          {view === 'month' && (
            <MonthView days={monthDays} events={events} todayKey={todayKey} onEventClick={openEvent} onDayClick={(d) => openCreate(atHour(d, 9))} firstDay={firstDay} />
          )}
          {view === 'week' && (
            <WeekView days={weekDays} events={events} energy={energy} todayKey={todayKey}
              onSlotCreate={openCreate} onEventClick={openEvent} onEventDrag={patchTimes} onEventResize={patchTimes}
              firstDay={firstDay} onAllDayCreate={openCreateAllDay} />
          )}
          {view === 'day' && (
            <DayView day={currentDate} events={events} energy={energy}
              onSlotCreate={openCreate} onEventClick={openEvent} onEventDrag={patchTimes} onEventResize={patchTimes} />
          )}
        </div>
      </div>

      {/* Unscheduled tasks sidebar — bottom padding accounts for the floating Coach pill (52px tall + 24px from bottom) */}
      {unscheduledTasks.length > 0 && (
        <div style={{ width: isMobile ? '100%' : 220, borderLeft: isMobile ? 'none' : '1px solid var(--color-border)', borderTop: isMobile ? '1px solid var(--color-border)' : 'none', background: 'var(--color-bg-primary)', padding: '16px 14px 84px', overflowY: 'auto', flexShrink: 0, maxHeight: isMobile ? '46vh' : undefined }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Unscheduled ({unscheduledTasks.length})
          </div>
          {/* Single primary action instead of one shouting button per task. */}
          {unscheduledTasks.length > 1 && (
            <button
              onClick={autoScheduleAll}
              disabled={schedulingAll}
              style={{
                width: '100%', padding: '7px 0', borderRadius: 6, marginBottom: 10,
                background: schedulingAll ? 'var(--color-bg-primary)' : 'var(--color-accent)',
                border: 'none',
                color: schedulingAll ? 'var(--color-text-muted)' : DARK_ON_ACCENT,
                fontSize: 12, fontWeight: 600, cursor: schedulingAll ? 'default' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {schedulingAll ? 'Scheduling all…' : `⚡ Auto-schedule all (${unscheduledTasks.length})`}
            </button>
          )}
          {schedulingResult && (
            <div style={{ background: '#EEF3EC', border: '1px solid #4F7A5233', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#4F7A52', marginBottom: 10 }}>
              {schedulingResult}
            </div>
          )}
          {unscheduledTasks.map((t) => (
            <div key={t.id} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{t.duration}m</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.priority === 'high' ? '#c0392b' : t.priority === 'medium' ? '#b45309' : '#15803d' }}>{t.priority}</span>
                {t.domainId && <span style={{ fontSize: 11, fontWeight: 600, color: DOMAIN_COLORS[t.domainId] }}>{t.domainId}</span>}
              </div>
              {/* Compact per-task action, sits under the task name, so it's
                  clearly "schedule THIS task" rather than a wall of identical
                  unlabeled buttons. */}
              <button
                onClick={() => autoSchedule(t.id)}
                disabled={scheduling === t.id || schedulingAll}
                title={`Auto-schedule “${t.name}”`}
                style={{
                  width: '100%', padding: '4px 0', borderRadius: 5,
                  background: (scheduling === t.id || schedulingAll) ? 'var(--color-bg-primary)' : 'transparent',
                  border: '1px solid var(--color-border-strong)',
                  color: (scheduling === t.id || schedulingAll) ? 'var(--color-text-muted)' : 'var(--skin-color-badge-text)',
                  fontSize: 11, cursor: (scheduling === t.id || schedulingAll) ? 'default' : 'pointer', fontFamily: 'inherit',
                }}
              >
                {scheduling === t.id ? 'Scheduling…' : '⚡ Schedule'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Event detail panel */}
      {editing && (
        <EventDetailPanel
          editing={editing}
          goals={goals}
          goalById={goalById}
          onClose={() => setEditing(null)}
          onSaved={(ev) => applyLocal(ev)}
          onDeleted={(id) => applyLocal(null, id)}
        />
      )}
    </div>
  )
}

function atHour(d: Date, h: number): Date { const x = new Date(d); x.setHours(h, 0, 0, 0); return x }
function defaultCreateStart(current: Date, view: CalView): Date {
  const base = view === 'month' ? new Date() : current
  const now = new Date()
  if (dayKey(base) === dayKey(now)) { const x = new Date(now); x.setMinutes(snapMinutes(x.getMinutes()), 0, 0); return x }
  return atHour(base, 9)
}

// ─── Event Detail Panel (create / edit / view) ───────────────────────────────

interface EditingEvent {
  mode: 'create' | 'edit' | 'view'
  id: string | null
  title: string
  description: string
  location: string
  startAt: string
  endAt: string
  allDay: boolean
  color: string | null
  goalId: string | null
  recurrenceRule: RecurrenceRule
  recurrenceUntil: string | null
  readOnly: boolean
  external?: boolean
}

function EventDetailPanel({ editing, goals, goalById, onClose, onSaved, onDeleted }: {
  editing: EditingEvent
  goals: GoalOption[]
  goalById: Map<string, GoalOption>
  onClose: () => void
  onSaved: (ev: CalendarEvent) => void
  onDeleted: (id: string) => void
}) {
  const [form, setForm] = useState<EditingEvent>(editing)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const readOnly = form.readOnly

  useEffect(() => { setForm(editing) }, [editing])

  const linkedGoal = form.goalId ? goalById.get(form.goalId) : null
  const accent = form.color ?? (linkedGoal ? DOMAIN_COLORS[linkedGoal.domainId] : null) ?? 'var(--color-accent)'

  function set<K extends keyof EditingEvent>(k: K, v: EditingEvent[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function save() {
    if (!form.title.trim()) { setErr('Give the event a title.'); return }
    if (new Date(form.endAt) <= new Date(form.startAt) && !form.allDay) { setErr('End must be after start.'); return }
    setSaving(true); setErr(null)
    const payload = {
      title: form.title.trim(),
      description: form.description,
      location: form.location || null,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      allDay: form.allDay,
      color: form.color,
      goalId: form.goalId,
      recurrenceRule: form.recurrenceRule,
      recurrenceUntil: form.recurrenceUntil ? new Date(form.recurrenceUntil).toISOString() : null,
    }
    try {
      const res = form.mode === 'create'
        ? await fetch('/api/calendar/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch(`/api/calendar/events/${form.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { setErr('Could not save, try again.'); setSaving(false); return }
      // Optimistically reflect the saved event in every view immediately (the
      // week grid reads the same state), then reconcile with the server. Fall
      // back to the form values if the response body isn't the event.
      let saved: CalendarEvent
      try {
        const data = await res.json()
        saved = normalizeSaved(data, form)
      } catch {
        saved = normalizeSaved(null, form)
      }
      onSaved(saved)
      onClose()
    } catch { setErr('Could not save, try again.'); setSaving(false) }
  }

  async function remove() {
    if (!form.id) return
    if (!window.confirm('Delete this event?')) return
    setSaving(true)
    const removedId = form.id
    try {
      const res = await fetch(`/api/calendar/events/${form.id}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Delete failed, try again.'); setSaving(false); return }
      onDeleted(removedId)
      onClose()
    } catch { setErr('Delete failed, try again.'); setSaving(false) }
  }

  /** Duplicate this event 24h later as a new native event ("copy to tomorrow"). */
  async function duplicateTomorrow() {
    setSaving(true); setErr(null)
    try {
      const startAt = new Date(new Date(form.startAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
      const endAt = new Date(new Date(form.endAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title || 'Untitled', description: form.description || '',
          location: form.location || null, startAt, endAt, allDay: form.allDay,
          goalId: form.goalId || null, color: form.color || null,
        }),
      })
      if (!res.ok) { setErr('Copy failed, try again.'); setSaving(false); return }
      const data = await res.json().catch(() => null)
      onSaved(normalizeSaved(data, { ...form, id: null, startAt, endAt }))
      onClose()
    } catch { setErr('Copy failed, try again.'); setSaving(false) }
  }

  const title = form.mode === 'create' ? 'New event' : readOnly ? (form.external ? 'External event' : 'Event') : 'Edit event'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(20,16,10,0.45)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420, maxWidth: '92vw', height: '100%', background: 'var(--color-bg-secondary)',
          borderLeft: `4px solid ${accent}`, boxShadow: '-12px 0 40px rgba(0,0,0,0.25)',
          padding: 24, overflowY: 'auto', color: 'var(--color-text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-serif), Fraunces, Georgia, serif' }}>{title}</h2>
          <button onClick={onClose} style={{ ...btnStyle, padding: '4px 10px' }} aria-label="Close">✕</button>
        </div>

        {readOnly ? (
          <ReadOnlyDetail form={form} linkedGoal={linkedGoal} accent={accent} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Title">
              <input autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Event title…" style={inputStyle} />
            </Field>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input id="allday" type="checkbox" checked={form.allDay} onChange={(e) => set('allDay', e.target.checked)} />
              <label htmlFor="allday" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>All day</label>
            </div>

            {/* Split date/time pickers — accessible, consistent across browsers. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Starts */}
              <Field label="Starts">
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="date"
                    value={toLocalInput(form.startAt).slice(0, 10)}
                    onChange={(e) => {
                      const [y, m, d] = e.target.value.split('-').map(Number)
                      const cur = new Date(toLocalInput(form.startAt))
                      const ny = new Date(y, m - 1, d, cur.getHours(), cur.getMinutes())
                      set('startAt', ny.toISOString())
                    }}
                    style={inputStyle}
                    aria-label="Start date"
                  />
                  {!form.allDay && (
                    <input
                      type="time"
                      value={toLocalInput(form.startAt).slice(11, 16)}
                      onChange={(e) => {
                        const [hh, mm] = e.target.value.split(':').map(Number)
                        const cur = new Date(form.startAt)
                        const ny = new Date(cur)
                        ny.setHours(hh, mm, 0, 0)
                        set('startAt', ny.toISOString())
                      }}
                      style={{ ...inputStyle, width: 90, flexShrink: 0 }}
                      aria-label="Start time"
                    />
                  )}
                </div>
              </Field>
              {/* Ends */}
              <Field label="Ends">
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="date"
                    value={toLocalInput(form.endAt).slice(0, 10)}
                    onChange={(e) => {
                      const [y, m, d] = e.target.value.split('-').map(Number)
                      const cur = new Date(toLocalInput(form.endAt))
                      const ny = new Date(y, m - 1, d, cur.getHours(), cur.getMinutes())
                      set('endAt', ny.toISOString())
                    }}
                    style={inputStyle}
                    aria-label="End date"
                  />
                  {!form.allDay && (
                    <input
                      type="time"
                      value={toLocalInput(form.endAt).slice(11, 16)}
                      onChange={(e) => {
                        const [hh, mm] = e.target.value.split(':').map(Number)
                        const cur = new Date(form.endAt)
                        const ny = new Date(cur)
                        ny.setHours(hh, mm, 0, 0)
                        set('endAt', ny.toISOString())
                      }}
                      style={{ ...inputStyle, width: 90, flexShrink: 0 }}
                      aria-label="End time"
                    />
                  )}
                </div>
              </Field>
            </div>

            <Field label="Location">
              <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Add a location…" style={inputStyle} />
            </Field>

            <Field label="Goal">
              <select value={form.goalId ?? ''} onChange={(e) => set('goalId', e.target.value || null)} style={inputStyle}>
                <option value="">No goal linked</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} · {g.domainId}</option>
                ))}
              </select>
              {linkedGoal && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: DOMAIN_COLORS[linkedGoal.domainId] ?? 'var(--color-accent)' }} />
                  {linkedGoal.name} <span style={{ color: 'var(--color-text-muted)' }}>({linkedGoal.domainId})</span>
                </div>
              )}
            </Field>

            <Field label="Repeat">
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={form.recurrenceRule.startsWith('days') ? 'days' : form.recurrenceRule}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === 'days') { const wd = new Date(form.startAt).getDay(); set('recurrenceRule', `days:${wd}` as RecurrenceRule) }
                    else set('recurrenceRule', v as RecurrenceRule)
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                  <option value="days">Custom weekdays…</option>
                </select>
                {form.recurrenceRule !== 'none' && (
                  <input type="date" title="Repeat until"
                    value={form.recurrenceUntil ? toLocalInput(form.recurrenceUntil).slice(0, 10) : ''}
                    onChange={(e) => set('recurrenceUntil', e.target.value ? new Date(e.target.value + 'T23:59').toISOString() : null)}
                    style={{ ...inputStyle, flex: 1 }} />
                )}
              </div>
              {form.recurrenceRule.startsWith('days') && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {([[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [0, 'S']] as [number, string][]).map(([d, lbl]) => {
                    const days = new Set(form.recurrenceRule.slice(5).split(',').filter(Boolean).map(Number))
                    const on = days.has(d)
                    return (
                      <button key={d} type="button" title={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]}
                        onClick={() => {
                          const s = new Set(form.recurrenceRule.slice(5).split(',').filter(Boolean).map(Number))
                          if (s.has(d)) s.delete(d); else s.add(d)
                          if (s.size === 0) return // keep at least one weekday
                          set('recurrenceRule', `days:${Array.from(s).sort((a, b) => a - b).join(',')}` as RecurrenceRule)
                        }}
                        style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600, border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-border)'}`, background: on ? 'var(--color-accent)' : 'transparent', color: on ? DARK_ON_ACCENT : 'var(--color-text-secondary)' }}>
                        {lbl}
                      </button>
                    )
                  })}
                </div>
              )}
            </Field>

            <Field label="Colour">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {EVENT_COLORS.map((c) => (
                  <button key={c} onClick={() => set('color', c)}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid var(--color-text-primary)' : '2px solid var(--color-border)' }}
                    aria-label={`Colour ${c}`} />
                ))}
                <button onClick={() => set('color', null)}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: 'transparent', cursor: 'pointer', border: form.color === null ? '3px solid var(--color-text-primary)' : '2px dashed var(--color-border-strong)', fontSize: 11 }}
                  title="Use goal / default colour">↺</button>
              </div>
            </Field>

            <Field label="Notes">
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Notes / description…" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>

            {err && <div style={{ color: '#B5502F', fontSize: 12 }}>{err}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 4 }}>
              {form.mode === 'edit' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={remove} disabled={saving} style={{ ...btnStyle, color: '#B5502F', border: '1px solid #E3C4B6' }}>Delete</button>
                  <button onClick={duplicateTomorrow} disabled={saving} title="Create a copy of this event tomorrow at the same time" style={btnStyle}>
                    Copy → tomorrow
                  </button>
                </div>
              ) : <span />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={btnStyle}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ ...btnStyle, background: 'var(--color-accent)', color: DARK_ON_ACCENT, border: 'none', fontWeight: 600 }}>
                  {saving ? 'Saving…' : form.mode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ReadOnlyDetail({ form, linkedGoal, accent }: { form: EditingEvent; linkedGoal: GoalOption | null | undefined; accent: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: accent }}>{form.title}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
        {form.allDay ? 'All day' : `${fmtTime(new Date(form.startAt))} - ${fmtTime(new Date(form.endAt))}`}
        {' · '}{new Date(form.startAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
      {form.location && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>📍 {form.location}</div>}
      {linkedGoal && <div style={{ fontSize: 13 }}>Goal: {linkedGoal.name}</div>}
      {form.description && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{form.description}</div>}
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', background: 'var(--color-bg-primary)', borderRadius: 8, padding: '10px 12px' }}>
        {form.external ? 'Read-only event from a connected calendar (busy time). Edit it in its source calendar.' : 'Read-only.'}
      </div>
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}

// ─── Month View ──────────────────────────────────────────────────────────────

function MonthView({ days, events, todayKey, onEventClick, onDayClick, firstDay = 1 }: {
  days: Date[]; events: CalendarEvent[]; todayKey: string
  onEventClick: (e: CalendarEvent) => void; onDayClick: (d: Date) => void
  firstDay?: 0 | 1
}) {
  const WEEKDAYS = firstDay === 0
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const currentMonth = days[15]?.getMonth()
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--color-border)' }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, minmax(100px, 1fr))' }}>
        {days.map((day, i) => {
          const key = dayKey(day)
          const dayEvents = [...allDayForDay(events, day), ...eventsForDay(events, day)]
          const isToday = key === todayKey
          const isCurrentMonth = day.getMonth() === currentMonth
          return (
            <div key={i} onClick={() => onDayClick(day)} style={{
              borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)',
              padding: '8px 10px', minHeight: 100, cursor: 'pointer',
              background: isToday ? 'var(--color-bg-primary)' : 'transparent',
              opacity: isCurrentMonth ? 1 : 0.4,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: isToday ? 'var(--color-accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: isToday ? '#fff' : 'var(--color-text-secondary)', fontWeight: isToday ? 700 : 400, marginBottom: 4,
              }}>{day.getDate()}</div>
              {dayEvents.slice(0, 3).map((e) => {
                const c = eventColor(e)
                return (
                  <div key={e.id} className="cal-event-text" onClick={(ev) => { ev.stopPropagation(); onEventClick(e) }} style={{
                    padding: '2px 6px', borderRadius: 3, marginBottom: 2, cursor: 'pointer',
                    background: c + '22', color: eventTextColor(c), fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    borderLeft: `2px solid ${c}`,
                  }}>
                    {e.allDay ? '' : fmtTime(new Date(e.startAt)) + ' '}{e.title}
                  </div>
                )
              })}
              {dayEvents.length > 3 && <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>+{dayEvents.length - 3} more</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Time-grid (shared drag/resize/create for Week + Day) ────────────────────

function useGridInteractions(
  onEventDrag: (id: string, start: Date, end: Date) => void,
  onEventResize: (id: string, start: Date, end: Date) => void,
) {
  const dragRef = useRef<{ e: CalendarEvent; startY: number; startTop: number } | null>(null)
  const resizeRef = useRef<{ e: CalendarEvent; startY: number; startHeight: number } | null>(null)
  const [ghost, setGhost] = useState<{ id: string; top: number; height: number } | null>(null)
  const ghostRef = useRef(ghost)
  ghostRef.current = ghost

  function beginDrag(ev: React.MouseEvent, event: CalendarEvent) {
    if (event.readOnly || event.recurrenceRule !== 'none') return // masters/external not dragged
    ev.preventDefault(); ev.stopPropagation()
    dragRef.current = { e: event, startY: ev.clientY, startTop: eventTop(event) }
    const height = eventHeight(event)
    function move(m: MouseEvent) {
      if (!dragRef.current) return
      const delta = m.clientY - dragRef.current.startY
      const snappedTop = Math.max(0, Math.round((dragRef.current.startTop + delta) / SLOT_PX) * SLOT_PX)
      setGhost({ id: event.id, top: snappedTop, height })
    }
    function up() {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up)
      const g = ghostRef.current
      dragRef.current = null; setGhost(null)
      if (!g) return
      const minutesFromStart = (g.top / SLOT_PX) * SLOT_MIN
      const base = new Date(event.startAt)
      const newStart = new Date(base); newStart.setHours(DAY_START_HOUR, 0, 0, 0)
      newStart.setMinutes(newStart.getMinutes() + minutesFromStart)
      const durMs = new Date(event.endAt).getTime() - new Date(event.startAt).getTime()
      onEventDrag(event.id, newStart, new Date(newStart.getTime() + durMs))
    }
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up)
  }

  function beginResize(ev: React.MouseEvent, event: CalendarEvent) {
    if (event.readOnly || event.recurrenceRule !== 'none') return
    ev.preventDefault(); ev.stopPropagation()
    const top = eventTop(event)
    resizeRef.current = { e: event, startY: ev.clientY, startHeight: eventHeight(event) }
    function move(m: MouseEvent) {
      if (!resizeRef.current) return
      const delta = m.clientY - resizeRef.current.startY
      const snappedH = Math.max(SLOT_PX, Math.round((resizeRef.current.startHeight + delta) / SLOT_PX) * SLOT_PX)
      setGhost({ id: event.id, top, height: snappedH })
    }
    function up() {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up)
      const g = ghostRef.current
      resizeRef.current = null; setGhost(null)
      if (!g) return
      const durationMin = (g.height / SLOT_PX) * SLOT_MIN
      const start = new Date(event.startAt)
      onEventResize(event.id, start, new Date(start.getTime() + durationMin * 60000))
    }
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up)
  }

  return { beginDrag, beginResize, ghost }
}

function EventBlock({ e, ghost, onClick, onDragStart, onResizeStart, dense, col = 0, cols = 1 }: {
  e: CalendarEvent
  ghost: { id: string; top: number; height: number } | null
  onClick: (e: CalendarEvent) => void
  onDragStart: (ev: React.MouseEvent, e: CalendarEvent) => void
  onResizeStart: (ev: React.MouseEvent, e: CalendarEvent) => void
  dense?: boolean
  col?: number   // overlap column index
  cols?: number  // total columns in this event's overlap cluster
}) {
  const isGhost = ghost?.id === e.id
  const top = isGhost ? ghost!.top : eventTop(e)
  const height = isGhost ? ghost!.height : eventHeight(e)
  const color = eventColor(e)
  const draggable = !e.readOnly && e.recurrenceRule === 'none'
  // Side-by-side layout for overlapping events: each takes 1/cols of the width.
  const leftPct = (col / cols) * 100
  const widthCalc = `calc(${100 / cols}% - ${cols > 1 ? 3 : 4}px)`
  // Motion pattern: TASKS look different from meetings (dashed spine + checkbox,
  // completable right on the grid); meetings stay solid. Local checked state so
  // no prop threading through the grid tree.
  const isTask = !!e.task
  const [checked, setChecked] = useState(e.task?.status === 'done')
  async function toggleDone(ev: React.MouseEvent) {
    ev.stopPropagation()
    if (!e.task) return
    const next = !checked
    setChecked(next)
    try {
      const res = await fetch(`/api/tasks/${e.task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next ? 'done' : 'todo' }),
      })
      if (!res.ok) setChecked(!next)
    } catch { setChecked(!next) }
  }
  return (
    <div
      onMouseDown={(ev) => draggable && onDragStart(ev, e)}
      onClick={(ev) => { ev.stopPropagation(); onClick(e) }}
      style={{
        position: 'absolute', top, height,
        left: `calc(${leftPct}% + 2px)`, width: widthCalc,
        background: e.external ? color + '18' : color + '22',
        border: `1px solid ${color}44`,
        borderLeft: isTask ? `3px dashed ${color}` : `3px solid ${color}`,
        borderRadius: 4, padding: dense ? '1px 5px' : '2px 6px',
        overflow: 'hidden', zIndex: isGhost ? 6 : 2,
        cursor: draggable ? 'grab' : 'pointer',
        opacity: e.readOnly ? 0.85 : checked ? 0.55 : 1,
        boxShadow: isGhost ? '0 2px 10px rgba(0,0,0,0.2)' : 'none',
      }}
      title={`${e.title}${e.location ? ' · ' + e.location : ''}${isTask ? ' · task' : ''}`}
    >
      <div className="cal-event-text" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: eventTextColor(color), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {isTask && (
          <button
            onClick={toggleDone}
            onMouseDown={(ev) => ev.stopPropagation()}
            aria-label={checked ? 'Mark task not done' : 'Mark task done'}
            title={checked ? 'Mark not done' : 'Mark done'}
            style={{
              width: 11, height: 11, flexShrink: 0, padding: 0, cursor: 'pointer',
              borderRadius: 3, border: `1.5px solid ${eventTextColor(color)}`,
              background: checked ? eventTextColor(color) : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, lineHeight: 1, color: 'var(--color-bg-card)',
            }}
          >
            {checked ? '✓' : ''}
          </button>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: checked ? 'line-through' : 'none' }}>
          {e.recurrenceRule !== 'none' && '↻ '}{e.title}
        </span>
      </div>
      {height > 34 && (
        <div className="cal-event-sub" style={{ fontSize: 10, color: eventTextColor(color) + 'cc' }}>{fmtTime(new Date(e.startAt))} - {fmtTime(new Date(e.endAt))}</div>
      )}
      {draggable && (
        <div onMouseDown={(ev) => onResizeStart(ev, e)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 7, cursor: 'ns-resize' }} title="Drag to resize">
          <div style={{ width: 20, height: 2, borderRadius: 1, background: color + '77', margin: '0 auto', position: 'relative', top: 4 }} />
        </div>
      )}
    </div>
  )
}

// Click-drag to create on an empty column: returns handlers producing a start.
function useSlotCreate(day: Date, onSlotCreate: (start: Date, mins: number) => void) {
  const startRef = useRef<number | null>(null)
  const [sel, setSel] = useState<{ top: number; height: number } | null>(null)
  const selRef = useRef(sel); selRef.current = sel

  function topToDate(top: number): Date {
    const mins = snapMinutes((top / SLOT_PX) * SLOT_MIN)
    const d = new Date(day); d.setHours(DAY_START_HOUR, 0, 0, 0); d.setMinutes(d.getMinutes() + mins)
    return d
  }
  function onMouseDown(ev: React.MouseEvent<HTMLDivElement>) {
    const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect()
    const y = ev.clientY - rect.top
    const snapped = Math.round(y / SLOT_PX) * SLOT_PX
    startRef.current = snapped
    setSel({ top: snapped, height: SLOT_PX })
    function move(m: MouseEvent) {
      if (startRef.current == null) return
      const yy = m.clientY - rect.top
      const snappedY = Math.round(yy / SLOT_PX) * SLOT_PX
      const top = Math.min(startRef.current, snappedY)
      const height = Math.max(SLOT_PX, Math.abs(snappedY - startRef.current))
      setSel({ top, height })
    }
    function up() {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up)
      const s = selRef.current
      startRef.current = null; setSel(null)
      if (!s) return
      const start = topToDate(s.top)
      const mins = Math.max(SLOT_MIN, (s.height / SLOT_PX) * SLOT_MIN)
      onSlotCreate(start, mins)
    }
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up)
  }
  return { onMouseDown, sel }
}

// ─── Week View ───────────────────────────────────────────────────────────────

function WeekView({ days, events, energy, todayKey, onSlotCreate, onEventClick, onEventDrag, onEventResize, firstDay = 1, onAllDayCreate }: {
  days: Date[]; events: CalendarEvent[]; energy: Record<number, EnergyLevel>; todayKey: string
  onSlotCreate: (start: Date, mins: number) => void
  onEventClick: (e: CalendarEvent) => void
  onEventDrag: (id: string, s: Date, e: Date) => void
  onEventResize: (id: string, s: Date, e: Date) => void
  firstDay?: 0 | 1
  onAllDayCreate?: (day: Date) => void
}) {
  const WEEKDAYS_SHORT = firstDay === 0
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const { beginDrag, beginResize, ghost } = useGridInteractions(onEventDrag, onEventResize)
  const anyAllDay = days.some((d) => allDayForDay(events, d).length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, background: 'var(--color-bg-primary)', zIndex: 10 }}>
        <div />
        {days.map((d, i) => {
          const isToday = dayKey(d) === todayKey
          return (
            <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{WEEKDAYS_SHORT[(d.getDay() - firstDay + 7) % 7]}</div>
              <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '2px auto 0', background: isToday ? 'var(--color-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: isToday ? DARK_ON_ACCENT : 'var(--color-text-primary)', fontWeight: isToday ? 700 : 400 }}>{d.getDate()}</div>
            </div>
          )
        })}
      </div>

      {/* All-day row — always visible; click an empty cell to create an all-day
          event on that day (existing pills still open their event). */}
      {(anyAllDay || onAllDayCreate) && (
        <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', borderBottom: '1px solid var(--color-border)', minHeight: 24 }}>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textAlign: 'right', paddingRight: 6, paddingTop: 4 }}>all-day</div>
          {days.map((d, i) => (
            <div
              key={i}
              onClick={() => onAllDayCreate?.(d)}
              title="Add an all-day event"
              style={{ borderLeft: '1px solid var(--color-border)', padding: 2, cursor: onAllDayCreate ? 'pointer' : 'default' }}
            >
              {allDayForDay(events, d).map((e) => {
                const c = eventColor(e)
                return <div key={e.id} className="cal-event-text" onClick={(ev) => { ev.stopPropagation(); onEventClick(e) }} style={{ background: c + '22', color: eventTextColor(c), borderLeft: `2px solid ${c}`, borderRadius: 3, fontSize: 10, padding: '1px 5px', marginBottom: 2, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
              })}
            </div>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)' }}>
          {/* Time labels (hour rows; each = 4×15-min sub-rows) */}
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: HOUR_PX, display: 'flex', alignItems: 'flex-start', paddingTop: 2, paddingRight: 8, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{formatHour(h)}</span>
              </div>
            ))}
          </div>

          {days.map((day, di) => (
            <DayColumn key={di} day={day} events={eventsForDay(events, day)} energy={energy}
              ghost={ghost} onSlotCreate={onSlotCreate} onEventClick={onEventClick}
              onDragStart={beginDrag} onResizeStart={beginResize} showNow={dayKey(day) === todayKey} dense />
          ))}
        </div>

        <div style={{ padding: '8px 12px', display: 'flex', gap: 16, borderTop: '1px solid var(--color-border)', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Energy:</span>
          <span style={{ fontSize: 10, color: '#22c55e' }}>■ Peak</span>
          <span style={{ fontSize: 10, color: '#f59e0b' }}>■ Good</span>
          <span style={{ fontSize: 10, color: '#ef4444' }}>■ Rest</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>Drag a slot to create · drag/resize events (15-min steps)</span>
        </div>
      </div>
    </div>
  )
}

// ─── Day column (used by both Week and Day views) ────────────────────────────

// Column-pack overlapping events so they render side-by-side (not stacked).
// id → { col, cols }: greedy interval colouring within each cluster of
// transitively-overlapping events.
function layoutColumns(events: CalendarEvent[]): Map<string, { col: number; cols: number }> {
  const out = new Map<string, { col: number; cols: number }>()
  const timed = events
    .map((e) => ({ id: e.id, s: new Date(e.startAt).getTime(), e: new Date(e.endAt).getTime() }))
    .sort((a, b) => a.s - b.s || a.e - b.e)
  let cluster: typeof timed = []
  let clusterEnd: number | null = null
  const flush = (grp: typeof timed) => {
    const colEnds: number[] = []
    const colOf = new Map<string, number>()
    for (const ev of grp) {
      let placed = -1
      for (let i = 0; i < colEnds.length; i++) {
        if (colEnds[i] <= ev.s) { colEnds[i] = ev.e; placed = i; break }
      }
      if (placed < 0) { placed = colEnds.length; colEnds.push(ev.e) }
      colOf.set(ev.id, placed)
    }
    const total = colEnds.length
    for (const ev of grp) out.set(ev.id, { col: colOf.get(ev.id) ?? 0, cols: total })
  }
  for (const ev of timed) {
    if (cluster.length && clusterEnd !== null && ev.s >= clusterEnd) { flush(cluster); cluster = []; clusterEnd = null }
    cluster.push(ev)
    clusterEnd = clusterEnd === null ? ev.e : Math.max(clusterEnd, ev.e)
  }
  if (cluster.length) flush(cluster)
  return out
}

function DayColumn({ day, events, energy, ghost, onSlotCreate, onEventClick, onDragStart, onResizeStart, showNow, dense }: {
  day: Date; events: CalendarEvent[]; energy: Record<number, EnergyLevel>
  ghost: { id: string; top: number; height: number } | null
  onSlotCreate: (start: Date, mins: number) => void
  onEventClick: (e: CalendarEvent) => void
  onDragStart: (ev: React.MouseEvent, e: CalendarEvent) => void
  onResizeStart: (ev: React.MouseEvent, e: CalendarEvent) => void
  showNow?: boolean; dense?: boolean
}) {
  const { onMouseDown, sel } = useSlotCreate(day, onSlotCreate)
  const now = new Date()
  const nowTop = ((now.getHours() - DAY_START_HOUR) * 60 + now.getMinutes()) * pxPerMinute()

  return (
    <div style={{ borderLeft: '1px solid var(--color-border)', position: 'relative', height: GRID_HEIGHT }} onMouseDown={onMouseDown}>
      {/* hour rows + 15-min guide lines */}
      {HOURS.map((h) => (
        <div key={h} style={{ height: HOUR_PX, borderBottom: '1px solid var(--color-border)', background: ENERGY_BG[energy[h] ?? 'red'] }}>
          {[1, 2, 3].map((q) => (
            <div key={q} style={{ height: SLOT_PX, borderBottom: '1px dashed var(--color-border)', opacity: 0.4 }} />
          ))}
        </div>
      ))}

      {/* selection preview while dragging to create */}
      {sel && (
        <div style={{ position: 'absolute', left: 2, right: 2, top: sel.top, height: sel.height, background: 'var(--color-accent)', opacity: 0.18, border: '1px solid var(--color-accent)', borderRadius: 4, zIndex: 4 }} />
      )}

      {/* now indicator */}
      {showNow && nowTop >= 0 && nowTop <= GRID_HEIGHT && (
        <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 2, background: '#ef4444', zIndex: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', position: 'absolute', left: -4, top: -3 }} />
        </div>
      )}

      {(() => {
        const layout = layoutColumns(events)
        return events.map((e) => {
          const pos = layout.get(e.id) ?? { col: 0, cols: 1 }
          return <EventBlock key={e.id} e={e} ghost={ghost} onClick={onEventClick} onDragStart={onDragStart} onResizeStart={onResizeStart} dense={dense} col={pos.col} cols={pos.cols} />
        })
      })()}
    </div>
  )
}

// ─── Day View ────────────────────────────────────────────────────────────────

function DayView({ day, events, energy, onSlotCreate, onEventClick, onEventDrag, onEventResize }: {
  day: Date; events: CalendarEvent[]; energy: Record<number, EnergyLevel>
  onSlotCreate: (start: Date, mins: number) => void
  onEventClick: (e: CalendarEvent) => void
  onEventDrag: (id: string, s: Date, e: Date) => void
  onEventResize: (id: string, s: Date, e: Date) => void
}) {
  const { beginDrag, beginResize, ghost } = useGridInteractions(onEventDrag, onEventResize)
  const allDay = allDayForDay(events, day)
  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ padding: '12px 8px 8px 64px', fontWeight: 600, fontSize: 15, fontFamily: 'var(--font-serif), Fraunces, Georgia, serif' }}>
        {day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
      {allDay.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', borderBottom: '1px solid var(--color-border)', padding: '2px 0' }}>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textAlign: 'right', paddingRight: 6, paddingTop: 4 }}>all-day</div>
          <div style={{ padding: 2 }}>
            {allDay.map((e) => { const c = eventColor(e); return <div key={e.id} className="cal-event-text" onClick={() => onEventClick(e)} style={{ background: c + '22', color: eventTextColor(c), borderLeft: `2px solid ${c}`, borderRadius: 3, fontSize: 11, padding: '2px 6px', marginBottom: 2, cursor: 'pointer' }}>{e.title}</div> })}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr' }}>
        <div>
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_PX, display: 'flex', alignItems: 'flex-start', paddingTop: 2, paddingRight: 8, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{formatHour(h)}</span>
            </div>
          ))}
        </div>
        <DayColumn day={day} events={eventsForDay(events, day)} energy={energy} ghost={ghost}
          onSlotCreate={onSlotCreate} onEventClick={onEventClick} onDragStart={beginDrag} onResizeStart={beginResize}
          showNow={dayKey(day) === dayKey(new Date())} />
      </div>
      <div style={{ padding: '8px 12px 16px 64px', fontSize: 10, color: 'var(--color-text-muted)' }}>
        Drag a slot to create · drag/resize events snap to 15 minutes
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 6, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
  color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
  borderRadius: 6, padding: '8px 10px', color: 'var(--color-text-primary)', fontSize: 13,
  boxSizing: 'border-box', fontFamily: 'inherit',
}
