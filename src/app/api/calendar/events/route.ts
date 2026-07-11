/**
 * GET  /api/calendar/events  → list events in range
 * POST /api/calendar/events  → create event (click-to-create slot)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const CreateEventSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  taskId: z.string().uuid().optional().nullable(),
  title: z.string().max(300).optional(),
  description: z.string().max(1000).default(''),
  allDay: z.boolean().default(false),
  domainId: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from') ?? new Date().toISOString()
  const to = searchParams.get('to') ?? new Date(Date.now() + 30 * 86400000).toISOString()

  const events = await prisma.calendarEvent.findMany({
    where: {
      userId: auth.userId,
      startAt: { gte: new Date(from) },
      endAt: { lte: new Date(to) },
    },
    include: {
      task: {
        select: {
          id: true, name: true, status: true, priority: true,
          energyRequired: true, duration: true,
        },
      },
    },
    orderBy: { startAt: 'asc' },
  })

  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = CreateEventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { startAt, endAt, taskId, title, description, allDay, domainId, color } = parsed.data
  const start = new Date(startAt)
  const end = new Date(endAt)

  // Resolve title from task if taskId provided
  let eventTitle = title ?? ''
  let resolvedDomainId = domainId
  if (taskId && !eventTitle) {
    const task = await prisma.oSTask.findFirst({
      where: { id: taskId, userId: auth.userId },
      select: { id: true, name: true, domainId: true, priority: true },
    })
    if (task) {
      eventTitle = task.name
      resolvedDomainId = resolvedDomainId ?? task.domainId
    }
  }

  if (!eventTitle) eventTitle = 'New event'

  const event = await prisma.calendarEvent.create({
    data: {
      userId: auth.userId,
      title: eventTitle,
      description,
      startAt: start,
      endAt: end,
      allDay,
      domainId: resolvedDomainId ?? null,
      color: color ?? null,
      taskId: taskId ?? null,
    },
  })

  return NextResponse.json(event, { status: 201 })
}
