'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface WorkPreferences {
  workingWindowStart: number
  workingWindowEnd: number
  blockLengthMin: number
  batching: 'batch' | 'spread'
  planningCadence: 'daily' | 'weekly' | 'biweekly'
}

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
    duration: number
  } | null
}

interface UnscheduledTask {
  id: string
  name: string
  duration: number
  priority: string
  domainId: string | null
}

interface Props {
  events: CalendarEvent[]
  unscheduledTasks: UnscheduledTask[]
  workPreferences: WorkPreferences
}

type CalView = 'day' | 'week' | 'month'

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}

// Subtle background tint for hours that fall inside the user's working window.
const WORKING_WINDOW_BG = 'rgba(99,102,241,0.06)'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6am - 11pm

function inWorkingWindow(h: number, wp: WorkPreferences): boolean {
  return h >= wp.workingWindowStart && h < wp.workingWindowEnd
}

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

export function CalendarView({ events, unscheduledTasks, workPreferences }: Props) {
  const [view, setView] = useState<CalView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scheduling, setScheduling] = useState<string | null>(null)
  const [schedulingResult, setSchedulingResult] = useState<string | null>(null)

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
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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
                  background: view === v ? '#6366f1' : '#1a1a1a',
                  color: view === v ? '#fff' : '#888',
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
            <WeekView days={weekDays} events={events} workPreferences={workPreferences} todayKey={todayKey} />
          )}
          {view === 'day' && (
            <DayView day={currentDate} events={events} workPreferences={workPreferences} />
          )}
        </div>
      </div>

      {/* Unscheduled Tasks Sidebar */}
      {unscheduledTasks.length > 0 && (
        <div style={{ width: 220, borderLeft: '1px solid #1a1a1a', background: '#0d0d0d', padding: '16px 14px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Unscheduled ({unscheduledTasks.length})
          </div>
          {schedulingResult && (
            <div style={{ background: '#1a2a1a', border: '1px solid #22c55e33', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#22c55e', marginBottom: 10 }}>
              {schedulingResult}
            </div>
          )}
          {unscheduledTasks.map((t) => (
            <div key={t.id} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#555' }}>{t.duration}m</span>
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
                  background: scheduling === t.id ? '#1a1a1a' : '#6366f133',
                  border: '1px solid #6366f144',
                  color: scheduling === t.id ? '#555' : '#8b8ff8',
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #1a1a1a' }}>
        {WEEKDAYS.map((d, i) => (
          <div key={d} style={{
            padding: '8px 12px', paddingRight: i === 6 ? 14 : 12,
            fontSize: 11, color: '#555', textTransform: 'uppercase', textAlign: 'center',
            borderLeft: i === 0 ? 'none' : '1px solid #141414',
          }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, minmax(100px, 1fr))' }}>
        {days.map((day, i) => {
          const key = day.toISOString().slice(0, 10)
          const dayEvents = eventsForDay(events, day)
          const isToday = key === todayKey
          const isCurrentMonth = day.getMonth() === currentMonth
          const isLastCol = (i + 1) % 7 === 0

          return (
            <div key={i} style={{
              borderRight: isLastCol ? 'none' : '1px solid #141414',
              borderBottom: '1px solid #141414',
              padding: '8px 10px', paddingRight: isLastCol ? 12 : 10,
              minHeight: 100,
              background: isToday ? '#0d0d18' : 'transparent',
              opacity: isCurrentMonth ? 1 : 0.35,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: isToday ? '#6366f1' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: isToday ? '#fff' : '#888', fontWeight: isToday ? 700 : 400,
                marginBottom: 4,
              }}>
                {day.getDate()}
              </div>
              {dayEvents.slice(0, 3).map((e) => (
                <div key={e.id} style={{
                  padding: '2px 6px', borderRadius: 3, marginBottom: 2,
                  background: (e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : '#6366f1') ?? '#6366f1') + '33',
                  color: e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : '#8b8ff8') ?? '#8b8ff8',
                  fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} {e.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 10, color: '#555' }}>+{dayEvents.length - 3} more</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ─────────────────────────────────────────────────────────────────

function WeekView({ days, events, workPreferences, todayKey }: { days: Date[]; events: CalendarEvent[]; workPreferences: WorkPreferences; todayKey: string }) {
  const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 }}>
        <div />
        {days.map((d, i) => {
          const key = d.toISOString().slice(0, 10)
          const isToday = key === todayKey
          return (
            <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid #141414' }}>
              <div style={{ fontSize: 10, color: '#555' }}>{WEEKDAYS_SHORT[i]}</div>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', margin: '2px auto 0',
                background: isToday ? '#6366f1' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: isToday ? '#fff' : '#ededed', fontWeight: isToday ? 700 : 400,
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
                <span style={{ fontSize: 10, color: '#444' }}>{formatHour(h)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayEvents = eventsForDay(events, day)
            return (
              <div key={di} style={{ borderLeft: '1px solid #141414', position: 'relative' }}>
                {HOURS.map((h) => (
                  <div key={h} style={{
                    height: 52,
                    borderBottom: '1px solid #141414',
                    background: inWorkingWindow(h, workPreferences) ? WORKING_WINDOW_BG : 'transparent',
                  }} />
                ))}
                {/* Events */}
                {dayEvents.map((e) => {
                  const top = eventTop(e)
                  const height = eventHeight(e)
                  const color = e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : '#6366f1') ?? '#6366f1'
                  return (
                    <div key={e.id} style={{
                      position: 'absolute', top, left: 2, right: 2, height,
                      background: color + '22', border: `1px solid ${color}44`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 4, padding: '2px 6px',
                      overflow: 'hidden', zIndex: 2,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.title}
                      </div>
                      {height > 36 && (
                        <div style={{ fontSize: 10, color: color + 'aa' }}>
                          {new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Working window legend */}
        <div style={{ padding: '8px 12px', display: 'flex', gap: 16, borderTop: '1px solid #141414' }}>
          <span style={{ fontSize: 10, color: '#555' }}>Working window: {formatHour(workPreferences.workingWindowStart)}–{formatHour(workPreferences.workingWindowEnd)} · {workPreferences.blockLengthMin}m blocks · {workPreferences.batching} · {workPreferences.planningCadence}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Day View ──────────────────────────────────────────────────────────────────

function DayView({ day, events, workPreferences }: { day: Date; events: CalendarEvent[]; workPreferences: WorkPreferences }) {
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
            <span style={{ fontSize: 10, color: '#444' }}>{formatHour(h)}</span>
          </div>
        ))}
      </div>

      <div style={{ borderLeft: '1px solid #1a1a1a', position: 'relative', marginLeft: 8 }}>
        {HOURS.map((h) => (
          <div key={h} style={{
            height: 52, borderBottom: '1px solid #141414',
            background: inWorkingWindow(h, workPreferences) ? WORKING_WINDOW_BG : 'transparent',
          }}>
            {inWorkingWindow(h, workPreferences) && (
              <span style={{ fontSize: 10, color: '#6366f166', marginLeft: 4, verticalAlign: 'top' }}>●</span>
            )}
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
          const color = e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : '#6366f1') ?? '#6366f1'
          return (
            <div key={e.id} style={{
              position: 'absolute', top, left: 8, right: 8, height,
              background: color + '20', border: `1px solid ${color}44`,
              borderLeft: `3px solid ${color}`, borderRadius: 6,
              padding: '6px 10px', overflow: 'hidden', zIndex: 2,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color }}>{e.title}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                {' – '}
                {new Date(e.endAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
              {e.task && height > 60 && (
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                  {e.task.priority} · {e.task.duration}m
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
  padding: '5px 12px', borderRadius: 6, background: '#1a1a1a', border: '1px solid #2a2a2a',
  color: '#888', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
}
