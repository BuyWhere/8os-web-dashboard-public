/**
 * GET    /api/vision/[id]  → single vision item
 * PATCH  /api/vision/[id]  → edit (title, note, imageUrl, goalId, category, position)
 * DELETE /api/vision/[id]  → remove
 * OS-2126 — Vision Board (userId-scoped, Clerk requireAuth, Zod-validated).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const UpdateVisionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  note: z.string().max(4000).optional(),
  imageUrl: z.string().url().max(2000).nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  position: z.number().int().optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const item = await prisma.visionItem.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const item = await prisma.visionItem.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateVisionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  if (parsed.data.goalId) {
    const goal = await prisma.goal.findFirst({ where: { id: parsed.data.goalId, userId: auth.userId }, select: { id: true } })
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 400 })
  }

  const updated = await prisma.visionItem.update({
    where: { id: params.id },
    data: { ...parsed.data, updatedAt: new Date() },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const item = await prisma.visionItem.findFirst({ where: { id: params.id, userId: auth.userId } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.visionItem.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
