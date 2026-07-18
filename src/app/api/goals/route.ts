/**
 * GET  /api/goals           → list user's goals (incl. horizon + targetDate)
 * POST /api/goals           → create a goal (with horizon + optional targetDate)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'
import { captureServerEvent } from '@/lib/analytics-server'
import { HORIZONS, DEFAULT_HORIZON, defaultTargetDate } from '@/lib/horizons'

const DOMAIN_IDS = ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'] as const
const CHECK_METHODS = ['binary', 'numeric', 'time', 'streak', 'milestone'] as const

const CreateGoalSchema = z.object({
  domainId: z.enum(DOMAIN_IDS),
  name: z.string().min(1).max(200),
  definition: z.string().min(1).max(1000),
  checkMethod: z.enum(CHECK_METHODS),
  checkConfig: z.record(z.unknown()).default({}),
  horizon: z.enum(HORIZONS).default(DEFAULT_HORIZON),
  // ISO date (YYYY-MM-DD) or full ISO datetime; nullable/optional.
  targetDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullish(),
})

function resolveCompanyId(): string {
  return (process.env.PAPERCLIP_COMPANY_ID ?? process.env.COMPANY_ID)?.length === 36
    ? (process.env.PAPERCLIP_COMPANY_ID ?? process.env.COMPANY_ID)!
    : '27f38d2c-bcdd-43c2-a022-89b0ee9ff548'
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? 'active'
  const horizon = searchParams.get('horizon')

  const goals = await prisma.goal.findMany({
    where: {
      userId: auth.userId,
      status: status as 'active' | 'paused' | 'completed' | 'archived',
      ...(horizon ? { horizon } : {}),
    },
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

  const { domainId, name, definition, checkMethod, checkConfig, horizon, targetDate } = parsed.data

  // The prod `goals` table has NOT NULL company_id/title/description columns
  // (out-of-band Paperclip multi-tenant migration) that the local Prisma
  // schema may not model — a plain prisma.goal.create() hits a
  // NullConstraintViolation. INSERT via raw SQL so those columns are always
  // populated (mirrors src/lib/os-seeder.ts). horizon + target_date are added
  // by the 20260712114743_goal_horizons migration.
  const companyId = resolveCompanyId()
  // Every goal gets a deadline: explicit if given, else the end of the current
  // period for its horizon (weekly → this Sunday, monthly → month end, …) so
  // there is always a completion reckoning.
  let targetDateVal = targetDate ? new Date(targetDate).toISOString().slice(0, 10) : null
  if (!targetDateVal) {
    try {
      const { getUserTimezone, userLocalDate } = await import('@/lib/user-time')
      const tz = await getUserTimezone(auth.userId)
      targetDateVal = defaultTargetDate(horizon, userLocalDate(tz))
    } catch {
      const now = new Date()
      targetDateVal = defaultTargetDate(horizon, { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() })
    }
  }

  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; domainId: string; name: string; definition: string; checkMethod: string; checkConfig: unknown; status: string; progress: number; horizon: string; target_date: Date | null; createdAt: Date; updatedAt: Date }>
  >(
    `INSERT INTO goals (
       id, "userId", "company_id", title, description, level, status,
       "domainId", name, definition, "checkMethod", "checkConfig", progress,
       horizon, target_date,
       "createdAt", "updatedAt", "created_at", "updated_at"
     ) VALUES (
       gen_random_uuid(), $1, $2::uuid, $3, $4, 'task', 'active',
       $5, $3, $4, $6, $7::jsonb, 0,
       $8, $9::date,
       NOW(), NOW(), NOW(), NOW()
     ) RETURNING id, "domainId", name, definition, "checkMethod", "checkConfig", status, progress, horizon, target_date, "createdAt", "updatedAt"`,
    auth.userId, companyId, name, definition, domainId, checkMethod, JSON.stringify(checkConfig), horizon, targetDateVal,
  )
  const goal = rows[0]

  await prisma.activityLog.create({
    data: { userId: auth.userId, goalId: goal.id, action: 'goal_created', metadata: { name: goal.name, horizon } },
  }).catch(() => {})

  captureServerEvent(auth.userId, 'goal_created', {
    domain_id: goal.domainId,
    check_method: goal.checkMethod,
    horizon,
  })

  return NextResponse.json(goal, { status: 201 })
}
