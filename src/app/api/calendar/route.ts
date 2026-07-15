/**
 * GET  /api/calendar   → events in range
 * POST /api/calendar   → create event
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const CreateEventSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().default(''),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().default(false),
  domainId: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
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
    include: { task: { select: { id: true, name: true, status: true, priority: true, energyRequired: true } } },
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

  const event = await prisma.calendarEvent.create({
    data: {
      userId: auth.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      allDay: parsed.data.allDay,
      domainId: parsed.data.domainId ?? null,
      color: parsed.data.color ?? null,
      taskId: parsed.data.taskId ?? null,
    },
  })

  return NextResponse.json(event, { status: 201 })
}
