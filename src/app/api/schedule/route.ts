/**
 * POST /api/schedule
 * Auto-schedule a task: finds the best energy-hour slot and avoids conflicts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { findBestSlot } from '@/lib/scheduling/engine'
import { z } from 'zod'

const Schema = z.object({
  taskId: z.string().uuid(),
  searchFrom: z.string().datetime().optional(),
  searchDays: z.number().int().min(1).max(30).default(7),
})

const DEFAULT_ENERGY: Record<number, 'green' | 'yellow' | 'red'> = Object.fromEntries(
  Array.from({ length: 24 }, (_, i) => {
    if (i >= 9 && i <= 11) return [i, 'green' as const]
    if (i >= 14 && i <= 16) return [i, 'green' as const]
    if ((i >= 6 && i <= 8) || (i >= 13 && i <= 17)) return [i, 'yellow' as const]
    return [i, 'red' as const]
  })
)

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const task = await prisma.oSTask.findFirst({ where: { id: parsed.data.taskId, userId: auth.userId } })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // Get user energy profile
  const energyProfileRaw = await prisma.energyProfile.findUnique({ where: { userId: auth.userId } })
  const energyMap = (energyProfileRaw?.hourMap as Record<number, 'green' | 'yellow' | 'red'>) ?? DEFAULT_ENERGY

  // Get existing calendar events as conflicts
  const searchFrom = parsed.data.searchFrom ? new Date(parsed.data.searchFrom) : new Date()
  const searchEnd = new Date(searchFrom)
  searchEnd.setDate(searchEnd.getDate() + parsed.data.searchDays)

  const existingEvents = await prisma.calendarEvent.findMany({
    where: { userId: auth.userId, startAt: { gte: searchFrom }, endAt: { lte: searchEnd } },
    select: { startAt: true, endAt: true },
  })

  const slot = findBestSlot({
    durationMinutes: task.duration,
    energyRequired: task.energyRequired as 'green' | 'yellow' | 'red',
    energyMap,
    existingEvents,
    searchFrom,
    searchDays: parsed.data.searchDays,
  })

  if (!slot) {
    return NextResponse.json({ error: 'No suitable slot found in search window' }, { status: 422 })
  }

  // Update task
  const updated = await prisma.oSTask.update({
    where: { id: task.id },
    data: { scheduledAt: slot.startAt, scheduledEnd: slot.endAt },
  })

  // Create/replace calendar event
  await prisma.calendarEvent.deleteMany({ where: { taskId: task.id } })
  await prisma.calendarEvent.create({
    data: {
      userId: auth.userId,
      taskId: task.id,
      title: task.name,
      startAt: slot.startAt,
      endAt: slot.endAt,
      domainId: task.domainId,
    },
  })

  return NextResponse.json({ task: updated, slot })
}
