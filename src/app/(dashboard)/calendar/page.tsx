/**
 * /calendar — Calendar (Calendar v2)
 * Day / Week / Month views with 15-minute granularity, full event CRUD, a
 * goal-linked event detail panel, simple recurrence expansion, Cal.diy bookings
 * and (read-only) external Google events as busy overlay.
 *
 * Server component: fetches goals (for the event-detail goal picker), native
 * calendar events (expanding simple recurrences across the visible window),
 * external events (deduped against natively-owned Google events to avoid the
 * push→re-import loop), and Cal.diy bookings; the client CalendarView renders.
 */
import { getServerAppUserId } from '@/lib/auth/server-user'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { QuickAdd } from '@/components/dashboard/QuickAdd'
import { CalendarView } from '@/components/dashboard/CalendarView'
import { getCalendarHours } from '@/lib/calendar-prefs'
import { caldiyApi } from '@/lib/caldiy/client'
import { syncStaleGoogleSources } from '@/lib/external/google-calendar'
import { syncStaleMicrosoftSources } from '@/lib/external/microsoft-calendar'
import type { CalDiyBooking } from '@/types/caldiy'

async function getUserId(): Promise<string> {
  return await getServerAppUserId('/calendar')
}

type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | `days:${string}`

interface ExpandedEvent {
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

/**
 * Expand a stored master event into concrete instances within [rangeStart,
 * rangeEnd]. Non-recurring events return a single instance. Simple RRULE-ish
 * cadence only (daily/weekly/biweekly/monthly), hard-capped so a bad rule can
 * never explode the page.
 */
function expandRecurrence(
  ev: {
    id: string; startAt: Date; endAt: Date; recurrenceRule: string
    recurrenceUntil: Date | null
  },
  rangeStart: Date,
  rangeEnd: Date,
): Array<{ startAt: Date; endAt: Date; instanceKey: string }> {
  const rule = ev.recurrenceRule ?? 'none'
  const durationMs = ev.endAt.getTime() - ev.startAt.getTime()
  if (rule === 'none') {
    return [{ startAt: ev.startAt, endAt: ev.endAt, instanceKey: ev.id }]
  }
  const hardEnd = ev.recurrenceUntil && ev.recurrenceUntil < rangeEnd ? ev.recurrenceUntil : rangeEnd
  const out: Array<{ startAt: Date; endAt: Date; instanceKey: string }> = []

  // Custom weekdays ("days:0,3,5", 0=Sun..6=Sat): step day-by-day, emit on any
  // selected weekday. Fast-forward to the visible range first so a far-past
  // master doesn't burn the iteration cap.
  if (rule.startsWith('days:')) {
    const wanted = new Set(rule.slice(5).split(',').filter(Boolean).map(Number))
    if (wanted.size === 0) return [{ startAt: ev.startAt, endAt: ev.endAt, instanceKey: ev.id }]
    const cursor = new Date(ev.startAt)
    if (cursor < rangeStart) {
      const behind = Math.floor((rangeStart.getTime() - cursor.getTime()) / 86400000) - 1
      if (behind > 0) cursor.setDate(cursor.getDate() + behind)
    }
    for (let i = 0; i < 220; i++) {
      if (cursor > hardEnd) break
      if (wanted.has(cursor.getDay())) {
        const end = new Date(cursor.getTime() + durationMs)
        if (end >= rangeStart) out.push({ startAt: new Date(cursor), endAt: end, instanceKey: `${ev.id}:${cursor.toISOString().slice(0, 10)}` })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return out
  }

  const cursor = new Date(ev.startAt)
  const MAX = 400 // safety cap
  for (let i = 0; i < MAX; i++) {
    if (cursor > hardEnd) break
    const end = new Date(cursor.getTime() + durationMs)
    if (end >= rangeStart) {
      out.push({
        startAt: new Date(cursor),
        endAt: end,
        instanceKey: `${ev.id}:${cursor.toISOString().slice(0, 10)}`,
      })
    }
    if (rule === 'daily') cursor.setDate(cursor.getDate() + 1)
    else if (rule === 'weekly') cursor.setDate(cursor.getDate() + 7)
    else if (rule === 'biweekly') cursor.setDate(cursor.getDate() + 14)
    else if (rule === 'monthly') cursor.setMonth(cursor.getMonth() + 1)
    else break
  }
  return out
}

export default async function CalendarPage() {
  const userId = await getUserId()

  // On-view freshness: pull recent Google changes before rendering (incremental,
  // best-effort, ≤60s-throttled) so opening the calendar shows what changed
  // upstream — no waiting for a manual sync.
  await Promise.all([
    syncStaleGoogleSources(userId).catch(() => {}),
    syncStaleMicrosoftSources(userId).catch(() => {}),
  ])

  const now = new Date()
  const rangeStart = new Date(now)
  rangeStart.setDate(rangeStart.getDate() - 31)
  const rangeEnd = new Date(now)
  rangeEnd.setDate(rangeEnd.getDate() + 120)

  const [goals, calendarEventsRaw, energyProfileRaw, tasks, externalEventsRaw, userSettingsRaw] = await Promise.all([
    prisma.goal.findMany({
      where: { userId, status: 'active' },
      select: { id: true, domainId: true, name: true, progress: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Fetch recurring masters (any start ≤ rangeEnd) + all non-recurring events
    // in range. Recurring masters are expanded below.
    prisma.calendarEvent.findMany({
      where: {
        userId,
        OR: [
          { recurrenceRule: 'none', startAt: { gte: rangeStart, lte: rangeEnd } },
          { recurrenceRule: { not: 'none' }, startAt: { lte: rangeEnd } },
        ],
      },
      include: { task: { select: { id: true, name: true, status: true, priority: true, energyRequired: true, duration: true } } },
      orderBy: { startAt: 'asc' },
    }),
    prisma.energyProfile.findUnique({ where: { userId } }),
    prisma.oSTask.findMany({
      where: { userId, status: 'todo', scheduledAt: null },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: 20,
    }),
    prisma.externalEvent.findMany({
      where: { userId, isDeleted: false, startsAt: { lte: rangeEnd }, endsAt: { gte: rangeStart } },
      select: { id: true, externalId: true, icalUid: true, title: true, startsAt: true, endsAt: true },
      take: 1000,
    }),
    prisma.userSettings.findUnique({ where: { userId }, select: { firstDayOfWeek: true } }),
  ])

  const energyMap = (energyProfileRaw?.hourMap as Record<number, 'green' | 'yellow' | 'red'>) ?? null
  const firstDayOfWeek: 0 | 1 = userSettingsRaw?.firstDayOfWeek === 0 ? 0 : 1
  const { start: dayStartHour, end: dayEndHour } = await getCalendarHours(userId)

  // Native events (with recurrence expansion). Track which Google event ids 8os
  // owns so the read-only external overlay never double-shows a pushed event.
  const ownedGoogleIds = new Set(
    calendarEventsRaw.map((e) => e.googleEventId).filter((x): x is string => !!x),
  )
  const nativeEvents: ExpandedEvent[] = []
  for (const e of calendarEventsRaw) {
    const instances = expandRecurrence(
      { id: e.id, startAt: e.startAt, endAt: e.endAt, recurrenceRule: e.recurrenceRule, recurrenceUntil: e.recurrenceUntil },
      rangeStart,
      rangeEnd,
    )
    for (const inst of instances) {
      nativeEvents.push({
        id: inst.instanceKey === e.id ? e.id : inst.instanceKey,
        title: e.title,
        description: e.description,
        startAt: inst.startAt.toISOString(),
        endAt: inst.endAt.toISOString(),
        allDay: e.allDay,
        domainId: e.domainId,
        color: e.color,
        location: e.location,
        goalId: e.goalId,
        recurrenceRule: (e.recurrenceRule ?? 'none') as RecurrenceRule,
        recurrenceUntil: e.recurrenceUntil ? e.recurrenceUntil.toISOString() : null,
        googleEventId: e.googleEventId,
        external: false,
        // A recurring instance (key ≠ master id) is read-only in place — editing
        // targets the master; the detail panel opens the master for edits.
        readOnly: false,
        task: e.task ? {
          id: e.task.id, name: e.task.name, status: e.task.status,
          priority: e.task.priority, energyRequired: e.task.energyRequired, duration: e.task.duration,
        } : null,
      })
    }
  }

  // External (read-only overlay): drop any that 8os pushed (dedupe on the id).
  const externalEvents: ExpandedEvent[] = externalEventsRaw
    .filter((x) => !ownedGoogleIds.has(x.externalId))
    .map((x) => ({
      id: `ext-${x.id}`,
      title: x.title ?? 'Busy',
      description: '',
      startAt: x.startsAt.toISOString(),
      endAt: x.endsAt.toISOString(),
      allDay: false,
      domainId: null,
      // Literal hex (not a token): the view appends an alpha suffix (c + '18').
      color: '#8A8175',
      location: null,
      goalId: null,
      recurrenceRule: 'none',
      recurrenceUntil: null,
      googleEventId: x.externalId,
      external: true,
      // Google events are now editable in-app: edits write back to Google via
      // the ext- PATCH path. (Cal.diy bookings below stay read-only.)
      readOnly: false,
      task: null,
    }))

  let caldiyBookings: CalDiyBooking[] = []
  try {
    const bookingsData = await caldiyApi.bookings.list({ status: 'accepted', limit: 50 })
    caldiyBookings = bookingsData.bookings || []
  } catch (e) {
    console.error('Failed to fetch Cal.diy bookings:', e)
  }
  const mappedCaldiyBookings: ExpandedEvent[] = caldiyBookings.map((booking) => ({
    id: `caldiy-${booking.id}`,
    title: booking.title,
    description: 'Booked via Cal.diy',
    startAt: booking.startTime,
    endAt: booking.endTime,
    allDay: false,
    domainId: null,
    color: '#3b82f6',
    location: null,
    goalId: null,
    recurrenceRule: 'none',
    recurrenceUntil: null,
    googleEventId: null,
    external: true,
    readOnly: true,
    task: null,
  }))

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={goals} />

      <main className="cal-main" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <CalendarView
          events={[...nativeEvents, ...externalEvents, ...mappedCaldiyBookings]}
          goals={goals.map((g) => ({ id: g.id, name: g.name, domainId: g.domainId }))}
          unscheduledTasks={tasks.map((t) => ({
            id: t.id,
            name: t.name,
            duration: t.duration,
            priority: t.priority,
            energyRequired: t.energyRequired,
            domainId: t.domainId,
          }))}
          energyMap={energyMap}
          firstDayOfWeek={firstDayOfWeek}
          dayStartHour={dayStartHour}
          dayEndHour={dayEndHour}
        />
      </main>

      <QuickAdd />
    </div>
  )
}
