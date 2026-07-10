'use client'

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
}

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDayRange(around: Date, days = 7): Date[] {
  const result: Date[] = []
  const start = new Date(around)
  // Start from Monday
  const dow = start.getDay()
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1))
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    result.push(d)
  }
  return result
}

export function CalendarMini({ events }: Props) {
  const today = new Date()
  const weekDays = getDayRange(today, 7)

  const eventsByDay = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const key = new Date(e.startAt).toISOString().slice(0, 10)
    if (!eventsByDay.has(key)) eventsByDay.set(key, [])
    eventsByDay.get(key)!.push(e)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {weekDays.map((d) => {
          const key = d.toISOString().slice(0, 10)
          const isToday = key === today.toISOString().slice(0, 10)
          const dayEvents = eventsByDay.get(key) ?? []

          return (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{ color: '#999', fontSize: 10, marginBottom: 4 }}>{DAYS[d.getDay()]}</div>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', margin: '0 auto',
                background: isToday ? '#6366f1' : 'transparent',
                border: isToday ? 'none' : '1px solid #1e1e1e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: isToday ? '#fff' : '#888',
                fontWeight: isToday ? 700 : 400,
              }}>
                {d.getDate()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, alignItems: 'center' }}>
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    title={e.title}
                    style={{
                      width: 20, height: 4, borderRadius: 2,
                      background: e.color ?? (e.domainId ? DOMAIN_COLORS[e.domainId] : '#6366f1') ?? '#6366f1',
                    }}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div style={{ fontSize: 9, color: '#999' }}>+{dayEvents.length - 3}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
