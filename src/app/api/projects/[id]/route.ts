/**
 * PATCH /api/projects/[id] → update project (name, description, order)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  estimatedDuration: z.string().max(100).optional(),
  suggestedOrder: z.number().int().min(0).optional(),
  accepted: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const project = await prisma.oSProject.findFirst({
    where: { id: params.id, userId: auth.userId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await prisma.oSProject.update({
    where: { id: params.id },
    data: parsed.data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const project = await prisma.oSProject.findFirst({
    where: { id: params.id, userId: auth.userId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Soft-delete by unlinking tasks, then delete project
  await prisma.oSTask.updateMany({ where: { projectId: params.id }, data: { projectId: null } })
  await prisma.oSProject.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
