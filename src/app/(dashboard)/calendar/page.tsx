/**
 * /calendar — Calendar Views (Task 8)
 * Day / Week / Month views with scheduling intelligence.
 * Server component fetches events; client component renders the views.
 * Now merged with Cal.diy bookings.
 */
import { getServerAppUserId } from '@/lib/auth/server-user'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { QuickAdd } from '@/components/dashboard/QuickAdd'
import { CalendarView } from '@/components/dashboard/CalendarView'
import { caldiyApi } from '@/lib/caldiy/client'
import type { CalDiyBooking } from '@/types/caldiy'

async function getUserId(): Promise<string> {
  // Clerk is the source of truth (2026-07-10). Resolves the Clerk session
  // to an app User.id (lazy-provisioning if needed) or redirects to /login.
  return await getServerAppUserId('/calendar')
}

export default async function CalendarPage() {
  const userId = await getUserId()

  const now = new Date()
  const rangeStart = new Date(now)
  rangeStart.setDate(rangeStart.getDate() - 7)
  const rangeEnd = new Date(now)
  rangeEnd.setDate(rangeEnd.getDate() + 60)

  const [goals, calendarEvents, energyProfileRaw, tasks] = await Promise.all([
    prisma.goal.findMany({ where: { userId, status: 'active' }, select: { id: true, domainId: true, name: true, progress: true } }),
    prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: rangeStart }, endAt: { lte: rangeEnd } },
      include: { task: { select: { id: true, name: true, status: true, priority: true, energyRequired: true, duration: true } } },
      orderBy: { startAt: 'asc' },
    }),
    prisma.energyProfile.findUnique({ where: { userId } }),
    prisma.oSTask.findMany({
      where: { userId, status: 'todo', scheduledAt: null },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: 20,
    }),
  ])

  const energyMap = (energyProfileRaw?.hourMap as Record<number, 'green' | 'yellow' | 'red'>) ?? null

  let caldiyBookings: CalDiyBooking[] = []
  try {
    const bookingsData = await caldiyApi.bookings.list({ status: 'accepted', limit: 50 })
    caldiyBookings = bookingsData.bookings || []
  } catch (e) {
    console.error('Failed to fetch Cal.diy bookings:', e)
  }

  const mappedCaldiyBookings = caldiyBookings.map(booking => ({
    id: `caldiy-${booking.id}`,
    title: booking.title,
    description: 'Booked via Cal.diy',
    startAt: booking.startTime,
    endAt: booking.endTime,
    allDay: false,
    domainId: null,
    color: '#3b82f6', // A distinct color for Cal.diy bookings
    task: null,
  }))

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: '#F7F3EC', color: '#221F1A' }}>
      <Sidebar goals={goals} />

      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <CalendarView
          events={[
            ...calendarEvents.map((e) => ({
              id: e.id,
              title: e.title,
              description: e.description,
              startAt: e.startAt.toISOString(),
              endAt: e.endAt.toISOString(),
              allDay: e.allDay,
              domainId: e.domainId,
              color: e.color,
              task: e.task ? {
                id: e.task.id,
                name: e.task.name,
                status: e.task.status,
                priority: e.task.priority,
                energyRequired: e.task.energyRequired,
                duration: e.task.duration,
              } : null,
            })),
            ...mappedCaldiyBookings
          ]}
          unscheduledTasks={tasks.map((t) => ({
            id: t.id,
            name: t.name,
            duration: t.duration,
            priority: t.priority,
            energyRequired: t.energyRequired,
            domainId: t.domainId,
          }))}
          energyMap={energyMap}
        />
      </main>

      <QuickAdd />
    </div>
  )
}
