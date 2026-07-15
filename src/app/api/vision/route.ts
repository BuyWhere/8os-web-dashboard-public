/**
 * GET  /api/vision   → list the user's vision-board items (ordered)
 * POST /api/vision   → create a vision item
 * OS-2126 — Vision Board (userId-scoped, Clerk requireAuth, Zod-validated).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const CreateVisionSchema = z.object({
  title: z.string().min(1).max(200),
  note: z.string().max(4000).default(''),
  imageUrl: z.string().url().max(2000).optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
  category: z.string().max(60).optional().nullable(),
  position: z.number().int().optional(),
})

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const items = await prisma.visionItem.findMany({
    where: { userId: auth.userId },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = CreateVisionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data

  // If the item links a goal, verify it belongs to this user.
  if (data.goalId) {
    const goal = await prisma.goal.findFirst({ where: { id: data.goalId, userId: auth.userId }, select: { id: true } })
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 400 })
  }

  // Default position = end of the board.
  let position = data.position
  if (position === undefined) {
    const max = await prisma.visionItem.aggregate({ where: { userId: auth.userId }, _max: { position: true } })
    position = (max._max.position ?? -1) + 1
  }

  const item = await prisma.visionItem.create({
    data: {
      userId: auth.userId,
      title: data.title,
      note: data.note,
      imageUrl: data.imageUrl ?? null,
      goalId: data.goalId ?? null,
      category: data.category ?? null,
      position,
    },
  })

  return NextResponse.json(item, { status: 201 })
}
