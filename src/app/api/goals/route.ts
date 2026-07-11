/**
 * GET  /api/goals           → list user's goals
 * POST /api/goals           → create a goal
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'
import { captureServerEvent } from '@/lib/analytics-server'

const DOMAIN_IDS = ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'] as const
const CHECK_METHODS = ['binary', 'numeric', 'time', 'streak', 'milestone'] as const

const CreateGoalSchema = z.object({
  domainId: z.enum(DOMAIN_IDS),
  name: z.string().min(1).max(200),
  definition: z.string().min(1).max(1000),
  checkMethod: z.enum(CHECK_METHODS),
  checkConfig: z.record(z.unknown()).default({}),
})

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? 'active'

  const goals = await prisma.goal.findMany({
    where: { userId: auth.userId, status: status as 'active' | 'paused' | 'completed' | 'archived' },
    include: {
      projects: { include: { tasks: { where: { status: { not: 'cancelled' } } } } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = CreateGoalSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { domainId, name, definition, checkMethod, checkConfig } = parsed.data

  // The prod `goals` table has NOT NULL company_id/title/description columns
  // (out-of-band Paperclip multi-tenant migration) that the local Prisma
  // schema may not model — a plain prisma.goal.create() hits a
  // NullConstraintViolation. INSERT via raw SQL so those columns are always
  // populated (mirrors src/lib/os-seeder.ts).
  const companyId =
    (process.env.PAPERCLIP_COMPANY_ID ?? process.env.COMPANY_ID)?.length === 36
      ? (process.env.PAPERCLIP_COMPANY_ID ?? process.env.COMPANY_ID)!
      : '27f38d2c-bcdd-43c2-a022-89b0ee9ff548'

  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; domainId: string; name: string; definition: string; checkMethod: string; checkConfig: unknown; status: string; progress: number; createdAt: Date; updatedAt: Date }>
  >(
    `INSERT INTO goals (
       id, "userId", "company_id", title, description, level, status,
       "domainId", name, definition, "checkMethod", "checkConfig", progress,
       "createdAt", "updatedAt", "created_at", "updated_at"
     ) VALUES (
       gen_random_uuid(), $1, $2::uuid, $3, $4, 'task', 'active',
       $5, $3, $4, $6, $7::jsonb, 0,
       NOW(), NOW(), NOW(), NOW()
     ) RETURNING id, "domainId", name, definition, "checkMethod", "checkConfig", status, progress, "createdAt", "updatedAt"`,
    auth.userId, companyId, name, definition, domainId, checkMethod, JSON.stringify(checkConfig),
  )
  const goal = rows[0]

  await prisma.activityLog.create({
    data: { userId: auth.userId, goalId: goal.id, action: 'goal_created', metadata: { name: goal.name } },
  }).catch(() => {})

  captureServerEvent(auth.userId, 'goal_created', {
    domain_id: goal.domainId,
    check_method: goal.checkMethod,
  })

  return NextResponse.json(goal, { status: 201 })
}
