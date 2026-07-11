'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'

type EnergyLevel = 'green' | 'yellow' | 'red'

interface CalendarEvent {
  id: string
  title: string
  description: string
  startAt: string
  endAt: string
  allDay: boolean
  domainId: string | null
  color: string | null
  task: {
    id: string
    name: string
    status: string
    priority: string
    energyRequired: string
    duration: number
  } | null
}

interface UnscheduledTask {
  id: string
  name: string
  duration: number
  priority: string
  energyRequired: string
  domainId: string | null
}

interface Props {
  events: CalendarEvent[]
  unscheduledTasks: UnscheduledTask[]
  energyMap: Record<number, EnergyLevel> | null
}

type CalView = 'day' | 'week' | 'month'

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}

const ENERGY_BG: Record<EnergyLevel, string> = {
  green: 'rgba(34,197,94,0.05)',
  yellow: 'rgba(245,158,11,0.05)',
  red: 'rgba(239,68,68,0.03)',
}

const DEFAULT_ENERGY: Record<number, EnergyLevel> = Object.fromEntries(
  Array.from({ length: 24 }, (_, i) => {
    if (i >= 9 && i <= 11) return [i, 'green' as EnergyLevel]
    if (i >= 14 && i <= 16) return [i, 'green' as EnergyLevel]
    if ((i >= 6 && i <= 8) || (i >= 13 && i <= 17)) return [i, 'yellow' as EnergyLevel]
    return [i, 'red' as EnergyLevel]
  })
)

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6am - 11pm

function formatHour(h: number): string {
  const ampm = h >= 12 ? 'pm' : 'am'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}${ampm}`
}

function getWeekDays(around: Date): Date[] {
  const start = new Date(around)
  const dow = start.getDay()
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = first.getDay()
  const padStart = startDow === 0 ? 6 : startDow - 1
  const days: Date[] = []
  for (let i = padStart; i > 0; i--) {
    const d = new Date(first)
    d.setDate(d.getDate() - i)
    days.push(d)
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(last)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const key = day.toISOString().slice(0, 10)
  return events.filter((e) => new Date(e.startAt).toISOString().slice(0, 10) === key)
}

function eventTop(event: CalendarEvent): number {
  const start = new Date(event.startAt)
  const h = start.getHours() - 6
  const m = start.getMinutes()
  return (h * 60 + m) * (52 / 60) // 52px per hour
}

function eventHeight(event: CalendarEvent): number {
  const start = new Date(event.startAt)
  const end = new Date(event.endAt)
  const dur = (end.getTime() - start.getTime()) / 60000
  return Math.max(dur * (52 / 60), 24)
}

export function CalendarView({ events, unscheduledTasks, energyMap }: Props) {
  const [view, setView] = useState<CalView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scheduling, setScheduling] = useState<string | null>(null)
  const [schedulingResult, setSchedulingResult] = useState<string | null>(null)
  const [creatingSlot, setCreatingSlot] = useState<{ day: Date; hour: number } | null>(null)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [draggingEvent, setDraggingEvent] = useState<{ id: string; startAt: string; endAt: string } | null>(null)

  const energy = energyMap ?? DEFAULT_ENERGY

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])
  const monthDays = useMemo(() => getMonthDays(currentDate.getFullYear(), currentDate.getMonth()), [currentDate])

  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  async function autoSchedule(taskId: string) {
    setScheduling(taskId)
    setSchedulingResult(null)
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      const data = await res.json()
      if (res.ok) {
        setSchedulingResult(`Scheduled: ${new Date(data.slot.startAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setSchedulingResult(data.error ?? 'Could not find a slot')
      }
    } catch {
      setSchedulingResult('Scheduling failed')
    } finally {
      setScheduling(null)
    }
  }

  async function createEvent(day: Date, hour: number) {
    const startAt = new Date(day)
    startAt.setHours(hour, 0, 0, 0)
    const endAt = new Date(startAt)
    endAt.setHours(hour + 1)
    setCreatingSlot({ day, hour })
    setNewEventTitle('')
  }

  async function confirmCreate(taskId?: string) {
    if (!creatingSlot) return
    const startAt = new Date(creatingSlot.day)
    startAt.setHours(creatingSlot.hour, 0, 0, 0)
    const endAt = new Date(startAt)
    endAt.setHours(creatingSlot.hour + 1)
    try {
      const body: Record<string, unknown> = { startAt: startAt.toISOString(), endAt: endAt.toISOString() }
      if (taskId) body.taskId = taskId
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) window.location.reload()
    } catch {
      console.error('Failed to create event')
    }
    setCreatingSlot(null)
  }

  async function moveEvent(eventId: string, newStart: Date, newEnd: Date) {
    try {
      await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: newStart.toISOString(), endAt: newEnd.toISOString() }),
      })
      window.location.reload()
    } catch {
      console.error('Failed to move event')
    }
  }

  async function resizeEvent(eventId: string, newEnd: Date) {
    try {
      await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endAt: newEnd.toISOString() }),
      })
      window.location.reload()
    } catch {
      console.error('Failed to resize event')
    }
  }

  const headerTitle = view === 'month'
    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : view === 'week'
    ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Main Calendar Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E7DFD2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setCurrentDate(new Date())} style={btnStyle}>Today</button>
            <button onClick={() => navigate(-1)} style={btnStyle}>◀</button>
            <button onClick={() => navigate(1)} style={btnStyle}>▶</button>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{headerTitle}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['day', 'week', 'month'] as CalView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  ...btnStyle,
                  background: view === v ? '#B08637' : '#F7F3EC',
                  color: view === v ? '#fff' : '#6B6257',
                  textTransform: 'capitalize',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {view === 'month' && (
            <MonthView days={monthDays} events={events} todayKey={todayKey} />
          )}
          {view === 'week' && (
            <WeekView days={weekDays} events={events} energy={energy} todayKey={todayKey} onSlotClick={createEvent} onEventDrag={moveEvent} onEventResize={resizeEvent} />
          )}
          {view === 'day' && (
            <DayView day={currentDate} events={events} energy={energy} />
          )}
        </div>

        {/* Click-to-create slot dialog */}
        {creatingSlot && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onClick={() => setCreatingSlot(null)}
          >
            <div style={{
              background: '#FFFFFF', border: '1px solid #E7DFD2', borderRadius: 12,
              padding: '20px 24px', minWidth: 300, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ color: '#221F1A', fontWeight: 600, marginBottom: 12 }}>
                Add event at {creatingSlot.hour}:00 on {creatingSlot.day.toLocaleDateString()}
              </div>
              <input
                autoFocus
                value={newEventTitle}
                onChange={e => setNewEventTitle(e.target.value)}
                placeholder="Event title..."
                style={{
                  width: '100%', background: '#FFFFFF', border: '1px solid #E7DFD2',
                  borderRadius: 6, padding: '8px 12px', color: '#221F1A', fontSize: 14,
                  marginBottom: 12, boxSizing: 'border-box',
                }}
                onKeyDown={e => { if (e.key === 'Enter') confirmCreate() }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setCreatingSlot(null)} style={{ ...btnStyle, padding: '6px 16px' }}>Cancel</button>
                <button onClick={() => confirmCreate()} style={{ ...btnStyle, padding: '6px 16px', background: '#B08637', color: '#fff', border: 'none' }}>
                  Add Event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unscheduled Tasks Sidebar */}
      {unscheduledTasks.length > 0 && (
        <div style={{ width: 220, borderLeft: '1px solid #E7DFD2', background: '#F7F3EC', padding: '16px 14px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#8A8175', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Unscheduled ({unscheduledTasks.length})
          </div>
          {schedulingResult && (
            <div style={{ background: '#EEF3EC', border: '1px solid #4F7A5233', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#4F7A52', marginBottom: 10 }}>
              {schedulingResult}
            </div>
          )}
          {unscheduledTasks.map((t) => (
            <div key={t.id} style={{ background: '#FFFFFF', border: '1px solid #E7DFD2', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#8A8175' }}>{t.duration}m</span>
                <span style={{ fontSize: 10, color: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#22c55e' }}>
                  {t.priority}
                </span>
                {t.domainId && (
                  <span style={{ fontSize: 10, color: DOMAIN_COLORS[t.domainId] }}>{t.domainId}</span>
                )}
              </div>
              <button
                onClick={() => autoSchedule(t.id)}
                disabled={scheduling === t.id}
                style={{
                  width: '100%', padding: '4px 0', borderRadius: 5,
                  background: scheduling === t.id ? '#F7F3EC' : '#B0863733',
                  border: '1px solid #B0863744',
                  color: scheduling === t.id ? '#8A8175' : '#B08637',
                  fontSize: 11, cursor: scheduling === t.id ? 'default' : 'pointer', fontFamily: 'inherit',
                }}
              >
                {scheduling === t.id ? 'Scheduling...' : '⚡ Auto-schedule'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Month View ────────────────────────────────────────────────────────────────

function MonthView({ days, events, todayKey }: { days: Date[]; events: CalendarEvent[]; todayKey: string }) {
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const currentMonth = days[15]?.getMonth()

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #E7DFD2' }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ padding: '8px 12px', fontSize: 11, color: '#8A8175', textTransform: 'uppercase', textAlign: 'center' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, minmax(100px, 1fr))' }}>
        {days.map((day, i) => {
          const key = day.toISOString().slice(0, 10)
          const dayEvents = eventsForDay(events, day)
          const isToday = key === todayKey
          const isCurrentMonth = day.getMonth() === currentMonth

          return (
            <div key={i} style={{
              borderRight: '1px solid #E7DFD2', borderBottom: '1px solid #E7DFD2',
              padding: '8px 10px', minHeight: 100,
              background: isToday ? '#F7F3EC' : 'transparent',
              opacity: isCurrentMonth ? 1 : 0.35,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: isToday ? '#B08637' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: isToday ? '#fff' : '#6B6257', fontWeight: isToday ? 700 : 400,
                marginBottom: 4,
              }}>
                {day.getDate()}
              </div>
              {dayEvents.slice(0, 3).map((e) => (
                <div key={e.id} style={{
                  padding: '2px 6px', borderRadius: 3, marginBottom: 2,
                  background: (e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : '#B08637') ?? '#B08637') + '33',
                  color: e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : '#B08637') ?? '#B08637',
                  fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} {e.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 10, color: '#8A8175' }}>+{dayEvents.length - 3} more</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ─────────────────────────────────────────────────────────────────

function WeekView({ days, events, energy, todayKey, onSlotClick, onEventDrag, onEventResize }: { days: Date[]; events: CalendarEvent[]; energy: Record<number, EnergyLevel>; todayKey: string; onSlotClick?: (day: Date, hour: number) => void; onEventDrag?: (eventId: string, newStart: Date, newEnd: Date) => void; onEventResize?: (eventId: string, newEnd: Date) => void }) {
  const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dragRef = useRef<{ eventId: string; startY: number; startTop: number } | null>(null)
  const resizeRef = useRef<{ eventId: string; startClientY: number; originalEndMs: number } | null>(null)

  function handleMouseDown(e: React.MouseEvent, event: CalendarEvent) {
    e.preventDefault()
    const startY = e.clientY
    const startTop = eventTop(event)
    dragRef.current = { eventId: event.id, startY, startTop }

    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current) return
      const delta = e.clientY - dragRef.current.startY
      const newTop = Math.max(0, dragRef.current.startTop + delta)
      const hour = Math.floor(newTop / 52)
      const newStart = new Date(event.startAt)
      newStart.setHours(6 + hour, 0, 0, 0)
      const newEnd = new Date(newStart.getTime() + (new Date(event.endAt).getTime() - new Date(event.startAt).getTime()))
      if (onEventDrag) onEventDrag(event.id, newStart, newEnd)
    }

    function onMouseUp() {
      dragRef.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function handleResizeStart(e: React.MouseEvent, event: CalendarEvent) {
    e.preventDefault()
    e.stopPropagation()
    const startClientY = e.clientY
    const originalEndMs = new Date(event.endAt).getTime()
    resizeRef.current = { eventId: event.id, startClientY, originalEndMs }

    function onMouseMove(e: MouseEvent) {
      if (!resizeRef.current) return
      const deltaPx = e.clientY - resizeRef.current.startClientY
      const deltaMs = Math.round((deltaPx / 52) * 60 * 60 * 1000) // 52px per hour
      const newEndMs = resizeRef.current.originalEndMs + deltaMs
      const newEnd = new Date(newEndMs)
      if (onEventResize) onEventResize(resizeRef.current.eventId, newEnd)
    }

    function onMouseUp() {
      resizeRef.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid #E7DFD2', position: 'sticky', top: 0, background: '#F7F3EC', zIndex: 10 }}>
        <div />
        {days.map((d, i) => {
          const key = d.toISOString().slice(0, 10)
          const isToday = key === todayKey
          return (
            <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid #E7DFD2' }}>
              <div style={{ fontSize: 10, color: '#8A8175' }}>{WEEKDAYS_SHORT[i]}</div>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', margin: '2px auto 0',
                background: isToday ? '#B08637' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: isToday ? '#fff' : '#221F1A', fontWeight: isToday ? 700 : 400,
              }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          {/* Time labels */}
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: 52, display: 'flex', alignItems: 'flex-start', paddingTop: 4, paddingRight: 8, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, color: '#8A8175' }}>{formatHour(h)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayEvents = eventsForDay(events, day)
            return (
              <div key={di} style={{ borderLeft: '1px solid #E7DFD2', position: 'relative' }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    onClick={() => onSlotClick?.(day, h)}
                    style={{
                      height: 52,
                      borderBottom: '1px solid #E7DFD2',
                      background: ENERGY_BG[energy[h] ?? 'red'],
                      cursor: 'pointer',
                    }}
                    title="Click to add event"
                  />
                ))}
                {/* Events */}
                {dayEvents.map((e) => {
                  const top = eventTop(e)
                  const height = eventHeight(e)
                  const color = e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : '#B08637') ?? '#B08637'
                  return (
                    <div
                      key={e.id}
                      onMouseDown={(ev) => handleMouseDown(ev, e)}
                      style={{
                        position: 'absolute', top, left: 2, right: 2, height,
                        background: color + '22', border: `1px solid ${color}44`,
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 4, padding: '2px 6px',
                        overflow: 'hidden', zIndex: 2, cursor: 'grab',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.title}
                      </div>
                      {height > 36 && (
                        <div style={{ fontSize: 10, color: color + 'aa' }}>
                          {new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      )}
                      {/* Resize handle */}
                      <div
                        onMouseDown={(ev) => handleResizeStart(ev, e)}
                        style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: 6,
                          cursor: 'ns-resize', borderRadius: '0 0 4px 4px',
                        }}
                        title="Drag to resize"
                      >
                        <div style={{
                          width: 20, height: 2, borderRadius: 1,
                          background: color + '66', margin: '0 auto', position: 'relative', top: 3,
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Energy Legend */}
        <div style={{ padding: '8px 12px', display: 'flex', gap: 16, borderTop: '1px solid #E7DFD2' }}>
          <span style={{ fontSize: 10, color: '#8A8175' }}>Energy zones:</span>
          <span style={{ fontSize: 10, color: '#22c55e' }}>■ Peak</span>
          <span style={{ fontSize: 10, color: '#f59e0b' }}>■ Good</span>
          <span style={{ fontSize: 10, color: '#ef4444' }}>■ Rest</span>
          <span style={{ fontSize: 10, color: '#8A8175', marginLeft: 'auto' }}>Click to add · Drag to move</span>
        </div>
      </div>
    </div>
  )
}

// ─── Day View ──────────────────────────────────────────────────────────────────

function DayView({ day, events, energy }: { day: Date; events: CalendarEvent[]; energy: Record<number, EnergyLevel> }) {
  const dayEvents = eventsForDay(events, day)
  const now = new Date()
  const currentHour = now.getHours()
  const nowTop = (currentHour - 6) * 52 + (now.getMinutes() * 52 / 60)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', maxWidth: 800, margin: '0 auto' }}>
      <div />
      <div style={{ paddingLeft: 8, paddingTop: 12, paddingBottom: 4, fontWeight: 600, fontSize: 15 }}>
        {day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

      <div>
        {HOURS.map((h) => (
          <div key={h} style={{ height: 52, display: 'flex', alignItems: 'flex-start', paddingTop: 4, paddingRight: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10, color: '#8A8175' }}>{formatHour(h)}</span>
          </div>
        ))}
      </div>

      <div style={{ borderLeft: '1px solid #E7DFD2', position: 'relative', marginLeft: 8 }}>
        {HOURS.map((h) => (
          <div key={h} style={{
            height: 52, borderBottom: '1px solid #E7DFD2',
            background: ENERGY_BG[energy[h] ?? 'red'],
          }}>
            <span style={{ fontSize: 10, color: energy[h] === 'green' ? '#22c55e44' : energy[h] === 'yellow' ? '#f59e0b44' : '#ef444433', marginLeft: 4, verticalAlign: 'top' }}>
              {energy[h] === 'green' ? '●' : energy[h] === 'yellow' ? '●' : ''}
            </span>
          </div>
        ))}

        {/* Now indicator */}
        {day.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10) && nowTop >= 0 && nowTop < HOURS.length * 52 && (
          <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 2, background: '#ef4444', zIndex: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', position: 'absolute', left: -4, top: -3 }} />
          </div>
        )}

        {/* Events */}
        {dayEvents.map((e) => {
          const top = eventTop(e)
          const height = eventHeight(e)
          const color = e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : '#B08637') ?? '#B08637'
          return (
            <div key={e.id} style={{
              position: 'absolute', top, left: 8, right: 8, height,
              background: color + '20', border: `1px solid ${color}44`,
              borderLeft: `3px solid ${color}`, borderRadius: 6,
              padding: '6px 10px', overflow: 'hidden', zIndex: 2,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color }}>{e.title}</div>
              <div style={{ fontSize: 11, color: '#6B6257', marginTop: 2 }}>
                {new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                {' – '}
                {new Date(e.endAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
              {e.task && height > 60 && (
                <div style={{ fontSize: 11, color: '#8A8175', marginTop: 4 }}>
                  {e.task.priority} · {e.task.duration}m · {e.task.energyRequired} energy
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 6, background: '#F7F3EC', border: '1px solid #E7DFD2',
  color: '#6B6257', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
}
