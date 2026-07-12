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

type EnergyLevel = 'green' | 'yellow' | 'red'
type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'

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
}

type CalView = 'day' | 'week' | 'month'

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}

const EVENT_COLORS = ['#B08637', '#6366f1', '#22c55e', '#ec4899', '#3b82f6', '#8b5cf6', '#f59e0b', '#7A3B2E']

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
const DAY_START_HOUR = 6            // grid starts at 6am
const DAY_END_HOUR = 24             // …ends at midnight
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => i + DAY_START_HOUR)
const GRID_HEIGHT = HOURS.length * HOUR_PX

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
  return e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : null) ?? 'var(--color-accent, #B08637)'
}

/** The editable base id for an expanded recurring instance ("id:date" → "id"). */
function baseId(id: string): string {
  const i = id.indexOf(':')
  return i === -1 ? id : id.slice(0, i)
}

// ─── Root ────────────────────────────────────────────────────────────────────

export function CalendarView({ events, goals, unscheduledTasks, energyMap }: Props) {
  const [view, setView] = useState<CalView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scheduling, setScheduling] = useState<string | null>(null)
  const [schedulingResult, setSchedulingResult] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingEvent | null>(null)
  const firstDay = 1 // Monday-first (matches the app's default first-day-of-week)

  const energy = energyMap ?? DEFAULT_ENERGY
  const weekDays = useMemo(() => getWeekDays(currentDate, firstDay), [currentDate])
  const monthDays = useMemo(() => getMonthDays(currentDate.getFullYear(), currentDate.getMonth(), firstDay), [currentDate])
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
        setTimeout(() => window.location.reload(), 1200)
      } else setSchedulingResult(data.error ?? 'Could not find a slot')
    } catch { setSchedulingResult('Scheduling failed') }
    finally { setScheduling(null) }
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
  // events aren't dragged (guarded at the drag layer).
  const patchTimes = useCallback(async (id: string, start: Date, end: Date) => {
    try {
      await fetch(`/api/calendar/events/${baseId(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: start.toISOString(), endAt: end.toISOString() }),
      })
      window.location.reload()
    } catch { console.error('move/resize failed') }
  }, [])

  const headerTitle = view === 'month'
    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setCurrentDate(new Date())} style={btnStyle}>Today</button>
            <button onClick={() => navigate(-1)} style={btnStyle} aria-label="Previous">◀</button>
            <button onClick={() => navigate(1)} style={btnStyle} aria-label="Next">▶</button>
            <span style={{ fontWeight: 600, fontSize: 16, fontFamily: 'var(--font-serif), Fraunces, Georgia, serif' }}>{headerTitle}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => openCreate(defaultCreateStart(currentDate, view))}
              style={{ ...btnStyle, background: 'var(--color-accent)', color: '#fff', border: 'none', fontWeight: 600 }}
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
                    color: view === v ? '#fff' : 'var(--color-text-secondary)',
                    textTransform: 'capitalize',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {view === 'month' && (
            <MonthView days={monthDays} events={events} todayKey={todayKey} onEventClick={openEvent} onDayClick={(d) => openCreate(atHour(d, 9))} />
          )}
          {view === 'week' && (
            <WeekView days={weekDays} events={events} energy={energy} todayKey={todayKey}
              onSlotCreate={openCreate} onEventClick={openEvent} onEventDrag={patchTimes} onEventResize={patchTimes} />
          )}
          {view === 'day' && (
            <DayView day={currentDate} events={events} energy={energy}
              onSlotCreate={openCreate} onEventClick={openEvent} onEventDrag={patchTimes} onEventResize={patchTimes} />
          )}
        </div>
      </div>

      {/* Unscheduled tasks sidebar */}
      {unscheduledTasks.length > 0 && (
        <div style={{ width: 220, borderLeft: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', padding: '16px 14px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Unscheduled ({unscheduledTasks.length})
          </div>
          {schedulingResult && (
            <div style={{ background: '#EEF3EC', border: '1px solid #4F7A5233', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#4F7A52', marginBottom: 10 }}>
              {schedulingResult}
            </div>
          )}
          {unscheduledTasks.map((t) => (
            <div key={t.id} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{t.duration}m</span>
                <span style={{ fontSize: 10, color: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#22c55e' }}>{t.priority}</span>
                {t.domainId && <span style={{ fontSize: 10, color: DOMAIN_COLORS[t.domainId] }}>{t.domainId}</span>}
              </div>
              <button
                onClick={() => autoSchedule(t.id)}
                disabled={scheduling === t.id}
                style={{
                  width: '100%', padding: '4px 0', borderRadius: 5,
                  background: scheduling === t.id ? 'var(--color-bg-primary)' : '#B0863733',
                  border: '1px solid #B0863744',
                  color: scheduling === t.id ? 'var(--color-text-muted)' : 'var(--color-accent)',
                  fontSize: 11, cursor: scheduling === t.id ? 'default' : 'pointer', fontFamily: 'inherit',
                }}
              >
                {scheduling === t.id ? 'Scheduling…' : '⚡ Auto-schedule'}
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

function EventDetailPanel({ editing, goals, goalById, onClose }: {
  editing: EditingEvent
  goals: GoalOption[]
  goalById: Map<string, GoalOption>
  onClose: () => void
}) {
  const [form, setForm] = useState<EditingEvent>(editing)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const readOnly = form.readOnly

  useEffect(() => { setForm(editing) }, [editing])

  const linkedGoal = form.goalId ? goalById.get(form.goalId) : null
  const accent = form.color ?? (linkedGoal ? DOMAIN_COLORS[linkedGoal.domainId] : null) ?? '#B08637'

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
      if (!res.ok) { setErr('Could not save — try again.'); setSaving(false); return }
      window.location.reload()
    } catch { setErr('Could not save — try again.'); setSaving(false) }
  }

  async function remove() {
    if (!form.id) return
    if (!window.confirm('Delete this event?')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/calendar/events/${form.id}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Delete failed — try again.'); setSaving(false); return }
      window.location.reload()
    } catch { setErr('Delete failed — try again.'); setSaving(false) }
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

            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Starts" style={{ flex: 1 }}>
                <input type={form.allDay ? 'date' : 'datetime-local'}
                  value={form.allDay ? toLocalInput(form.startAt).slice(0, 10) : toLocalInput(form.startAt)}
                  onChange={(e) => set('startAt', (form.allDay ? new Date(e.target.value + 'T00:00') : fromLocalInput(e.target.value)).toISOString())}
                  style={inputStyle} />
              </Field>
              <Field label="Ends" style={{ flex: 1 }}>
                <input type={form.allDay ? 'date' : 'datetime-local'}
                  value={form.allDay ? toLocalInput(form.endAt).slice(0, 10) : toLocalInput(form.endAt)}
                  onChange={(e) => set('endAt', (form.allDay ? new Date(e.target.value + 'T23:59') : fromLocalInput(e.target.value)).toISOString())}
                  style={inputStyle} />
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
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: DOMAIN_COLORS[linkedGoal.domainId] ?? '#B08637' }} />
                  {linkedGoal.name} <span style={{ color: 'var(--color-text-muted)' }}>({linkedGoal.domainId})</span>
                </div>
              )}
            </Field>

            <Field label="Repeat">
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={form.recurrenceRule} onChange={(e) => set('recurrenceRule', e.target.value as RecurrenceRule)} style={{ ...inputStyle, flex: 1 }}>
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
                {form.recurrenceRule !== 'none' && (
                  <input type="date" title="Repeat until"
                    value={form.recurrenceUntil ? toLocalInput(form.recurrenceUntil).slice(0, 10) : ''}
                    onChange={(e) => set('recurrenceUntil', e.target.value ? new Date(e.target.value + 'T23:59').toISOString() : null)}
                    style={{ ...inputStyle, flex: 1 }} />
                )}
              </div>
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
                <button onClick={remove} disabled={saving} style={{ ...btnStyle, color: '#B5502F', border: '1px solid #E3C4B6' }}>Delete</button>
              ) : <span />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={btnStyle}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ ...btnStyle, background: 'var(--color-accent)', color: '#fff', border: 'none', fontWeight: 600 }}>
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
        {form.allDay ? 'All day' : `${fmtTime(new Date(form.startAt))} – ${fmtTime(new Date(form.endAt))}`}
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

function MonthView({ days, events, todayKey, onEventClick, onDayClick }: {
  days: Date[]; events: CalendarEvent[]; todayKey: string
  onEventClick: (e: CalendarEvent) => void; onDayClick: (d: Date) => void
}) {
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
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
                  <div key={e.id} onClick={(ev) => { ev.stopPropagation(); onEventClick(e) }} style={{
                    padding: '2px 6px', borderRadius: 3, marginBottom: 2, cursor: 'pointer',
                    background: c + '22', color: c, fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
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

function EventBlock({ e, ghost, onClick, onDragStart, onResizeStart, dense }: {
  e: CalendarEvent
  ghost: { id: string; top: number; height: number } | null
  onClick: (e: CalendarEvent) => void
  onDragStart: (ev: React.MouseEvent, e: CalendarEvent) => void
  onResizeStart: (ev: React.MouseEvent, e: CalendarEvent) => void
  dense?: boolean
}) {
  const isGhost = ghost?.id === e.id
  const top = isGhost ? ghost!.top : eventTop(e)
  const height = isGhost ? ghost!.height : eventHeight(e)
  const color = eventColor(e)
  const draggable = !e.readOnly && e.recurrenceRule === 'none'
  return (
    <div
      onMouseDown={(ev) => draggable && onDragStart(ev, e)}
      onClick={(ev) => { ev.stopPropagation(); onClick(e) }}
      style={{
        position: 'absolute', top, left: 2, right: 2, height,
        background: e.external ? color + '18' : color + '22',
        border: `1px solid ${color}44`, borderLeft: `3px solid ${color}`,
        borderRadius: 4, padding: dense ? '1px 5px' : '2px 6px',
        overflow: 'hidden', zIndex: isGhost ? 6 : 2,
        cursor: draggable ? 'grab' : 'pointer',
        opacity: e.readOnly ? 0.85 : 1,
        boxShadow: isGhost ? '0 2px 10px rgba(0,0,0,0.2)' : 'none',
      }}
      title={`${e.title}${e.location ? ' · ' + e.location : ''}`}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {e.recurrenceRule !== 'none' && '↻ '}{e.title}
      </div>
      {height > 34 && (
        <div style={{ fontSize: 10, color: color + 'cc' }}>{fmtTime(new Date(e.startAt))}</div>
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

function WeekView({ days, events, energy, todayKey, onSlotCreate, onEventClick, onEventDrag, onEventResize }: {
  days: Date[]; events: CalendarEvent[]; energy: Record<number, EnergyLevel>; todayKey: string
  onSlotCreate: (start: Date, mins: number) => void
  onEventClick: (e: CalendarEvent) => void
  onEventDrag: (id: string, s: Date, e: Date) => void
  onEventResize: (id: string, s: Date, e: Date) => void
}) {
  const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
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
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{WEEKDAYS_SHORT[(d.getDay() + 6) % 7]}</div>
              <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '2px auto 0', background: isToday ? 'var(--color-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: isToday ? '#fff' : 'var(--color-text-primary)', fontWeight: isToday ? 700 : 400 }}>{d.getDate()}</div>
            </div>
          )
        })}
      </div>

      {/* All-day row */}
      {anyAllDay && (
        <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', borderBottom: '1px solid var(--color-border)', minHeight: 26 }}>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textAlign: 'right', paddingRight: 6, paddingTop: 4 }}>all-day</div>
          {days.map((d, i) => (
            <div key={i} style={{ borderLeft: '1px solid var(--color-border)', padding: 2 }}>
              {allDayForDay(events, d).map((e) => {
                const c = eventColor(e)
                return <div key={e.id} onClick={() => onEventClick(e)} style={{ background: c + '22', color: c, borderLeft: `2px solid ${c}`, borderRadius: 3, fontSize: 10, padding: '1px 5px', marginBottom: 2, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
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

      {events.map((e) => (
        <EventBlock key={e.id} e={e} ghost={ghost} onClick={onEventClick} onDragStart={onDragStart} onResizeStart={onResizeStart} dense={dense} />
      ))}
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
            {allDay.map((e) => { const c = eventColor(e); return <div key={e.id} onClick={() => onEventClick(e)} style={{ background: c + '22', color: c, borderLeft: `2px solid ${c}`, borderRadius: 3, fontSize: 11, padding: '2px 6px', marginBottom: 2, cursor: 'pointer' }}>{e.title}</div> })}
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
