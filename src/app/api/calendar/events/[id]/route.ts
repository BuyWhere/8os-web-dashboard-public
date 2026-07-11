/**
 * PATCH /api/calendar/events/[id] → update event (drag-to-move)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const UpdateEventSchema = z.object({
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  title: z.string().max(300).optional(),
  color: z.string().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const event = await prisma.calendarEvent.findFirst({
    where: { id: params.id, userId: auth.userId },
  })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateEventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (parsed.data.startAt) update.startAt = new Date(parsed.data.startAt)
  if (parsed.data.endAt) update.endAt = new Date(parsed.data.endAt)
  if (parsed.data.title !== undefined) update.title = parsed.data.title
  if (parsed.data.color !== undefined) update.color = parsed.data.color

  const updated = await prisma.calendarEvent.update({
    where: { id: params.id },
    data: update,
  })

  return NextResponse.json(updated)
}
