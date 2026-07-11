/**
 * POST /api/alignment/rank — set the user's stated goal-priority order
 * (goal_rankings), used by the Alignment Engine's expected-share curve.
 *
 * Body: { rankings: [{ goalId, rank }, …] }  (rank 1 = highest priority)
 * Replace-all semantics: the submitted set becomes the user's entire explicit
 * ranking; goals not listed fall back to their seeded (createdAt) order.
 *
 * GET returns the current explicit rankings.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const RankSchema = z.object({
  rankings: z
    .array(
      z.object({
        goalId: z.string().min(1),
        rank: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(50),
})

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const rankings = await prisma.goalRanking.findMany({
    where: { userId: auth.userId },
    orderBy: { rank: 'asc' },
  })
  return NextResponse.json(rankings)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const parsed = RankSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const rankings = parsed.data.rankings
  const goalIds = Array.from(new Set(rankings.map((r) => r.goalId)))
  if (goalIds.length !== rankings.length) {
    return NextResponse.json({ error: 'Duplicate goalId in rankings.' }, { status: 400 })
  }

  // Every ranked goal must belong to the caller.
  const owned = await prisma.goal.findMany({
    where: { userId: auth.userId, id: { in: goalIds } },
    select: { id: true },
  })
  if (owned.length !== goalIds.length) {
    return NextResponse.json({ error: 'One or more goalIds do not belong to you.' }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.goalRanking.deleteMany({ where: { userId: auth.userId } }),
    prisma.goalRanking.createMany({
      data: rankings.map((r) => ({ userId: auth.userId, goalId: r.goalId, rank: r.rank })),
    }),
  ])

  return NextResponse.json({ ok: true, count: rankings.length })
}
