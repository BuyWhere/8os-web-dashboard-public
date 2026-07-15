/**
 * GET  /api/projects  → list user's projects with task counts
 * POST /api/projects  → create a project
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(2000).default(''),
  goalId: z.string().uuid(),
  estimatedDuration: z.string().max(100).default('1 week'),
  suggestedOrder: z.number().int().min(0).default(0),
})

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const projects = await prisma.oSProject.findMany({
    where: { userId: auth.userId },
    include: {
      goal: { select: { id: true, name: true, domainId: true } },
      tasks: { select: { id: true, status: true, name: true, priority: true } },
    },
    orderBy: [{ goal: { name: 'asc' } }, { suggestedOrder: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = CreateProjectSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const project = await prisma.oSProject.create({
    data: {
      userId: auth.userId,
      ...parsed.data,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
