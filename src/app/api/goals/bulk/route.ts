/**
 * POST /api/goals/bulk  → create many goals at once in a chosen horizon.
 *
 * The owner "uploads" their weekly / monthly / yearly goals: paste several
 * lines, pick a horizon, and each non-empty line becomes a goal. Uses the same
 * raw-SQL insert path as /api/goals (NOT NULL company_id/title/description).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'
import { captureServerEvent } from '@/lib/analytics-server'
import { HORIZONS, DEFAULT_HORIZON } from '@/lib/horizons'

const DOMAIN_IDS = ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'] as const

const BulkSchema = z.object({
  horizon: z.enum(HORIZONS).default(DEFAULT_HORIZON),
  domainId: z.enum(DOMAIN_IDS).default('career'),
  // Either a single blob of text (split on newlines) or an explicit array.
  text: z.string().max(20_000).optional(),
  names: z.array(z.string()).max(100).optional(),
  targetDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullish(),
})

function resolveCompanyId(): string {
  return (process.env.PAPERCLIP_COMPANY_ID ?? process.env.COMPANY_ID)?.length === 36
    ? (process.env.PAPERCLIP_COMPANY_ID ?? process.env.COMPANY_ID)!
    : '27f38d2c-bcdd-43c2-a022-89b0ee9ff548'
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = BulkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { horizon, domainId, text, names, targetDate } = parsed.data

  // Build the goal list: explicit names win, else split the text blob.
  const raw = names ?? (text ?? '').split('\n')
  const cleaned = raw
    .map((l) => l.replace(/^[\s\-*•\d.)]+/, '').trim()) // strip bullet/number prefixes
    .filter((l) => l.length > 0)
    .slice(0, 100)

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No goals found in input' }, { status: 400 })
  }

  const companyId = resolveCompanyId()
  const targetDateVal = targetDate ? new Date(targetDate).toISOString().slice(0, 10) : null

  const created: Array<{ id: string; name: string }> = []
  for (const name of cleaned) {
    const trimmed = name.slice(0, 200)
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
      `INSERT INTO goals (
         id, "userId", "company_id", title, description, level, status,
         "domainId", name, definition, "checkMethod", "checkConfig", progress,
         horizon, target_date,
         "createdAt", "updatedAt", "created_at", "updated_at"
       ) VALUES (
         gen_random_uuid(), $1, $2::uuid, $3, $4, 'task', 'active',
         $5, $3, $4, 'binary', '{}'::jsonb, 0,
         $6, $7::date,
         NOW(), NOW(), NOW(), NOW()
       ) RETURNING id, name`,
      auth.userId, companyId, trimmed, trimmed, domainId, horizon, targetDateVal,
    )
    created.push(rows[0])
    await prisma.activityLog.create({
      data: { userId: auth.userId, goalId: rows[0].id, action: 'goal_created', metadata: { name: trimmed, horizon, bulk: true } },
    }).catch(() => {})
  }

  captureServerEvent(auth.userId, 'goals_bulk_created', { horizon, domain_id: domainId, count: created.length })

  return NextResponse.json({ created, count: created.length }, { status: 201 })
}
