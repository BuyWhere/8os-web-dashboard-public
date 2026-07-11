/**
 * GET /api/quarter
 * Authed (Clerk requireAuth, userId-scoped). Quarterly / 12-week planning horizon:
 * projects the upcoming ~3 BaZi solar months (流月) forward, each with its monthly
 * pillar + favorable/consolidate verdict (vs the user's favorable elements) + the
 * goal-domains favorable for that month, then maps the user's active goals onto the
 * months suggested for pushing milestones.
 *
 * Reuses the SAME engine as /api/phases (src/lib/bazi-phases.ts → computeQuarter).
 * No new metaphysics, no hardcoded pillars: every pillar is derived from the solar-
 * term boundary via the existing 五虎遁 monthlyPillar() method.
 *
 * Query: ?months=3 (clamped 1..6).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { decrypt } from '@/lib/encryption'
import { calculateBazi } from '@/lib/bazi'
import { calculateDayMasterStrength } from '@/lib/bazi-strength'
import { computeQuarter, type Element } from '@/lib/bazi-phases'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  const monthsParam = parseInt(req.nextUrl.searchParams.get('months') ?? '3', 10)
  const months = Number.isFinite(monthsParam) ? monthsParam : 3

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      birthDateEncrypted: true, birthTimeEncrypted: true,
      gender: true, dayElement: true,
    },
  })
  if (!profile) {
    return NextResponse.json({ error: 'No birth profile — complete onboarding first.' }, { status: 404 })
  }

  let birthDate: string
  let birthTime: string | null = null
  try {
    birthDate = decrypt(profile.birthDateEncrypted)
    if (profile.birthTimeEncrypted) birthTime = decrypt(profile.birthTimeEncrypted)
  } catch (e) {
    console.error('[quarter] decrypt failed:', e)
    return NextResponse.json({ error: 'Could not read birth data.' }, { status: 500 })
  }

  const [y, m, d] = birthDate.split('-').map(Number)
  const [hh, mm] = birthTime ? birthTime.split(':').map(Number) : [12, 0]

  // Recompute the natal chart for Day Master element + strength.
  const natal = calculateBazi(y, m, d, hh, mm)
  const strength = calculateDayMasterStrength(natal).strength
  const dayElement = (profile.dayElement || natal.dayElement) as Element

  // User's active goals → mapped onto favorable months.
  const goals = await prisma.goal.findMany({
    where: { userId, status: 'active' },
    select: { id: true, name: true, domainId: true },
    orderBy: { createdAt: 'asc' },
    take: 40,
  }).catch(() => [])

  const now = new Date()
  const quarter = computeQuarter({
    dayElement,
    strength,
    now,
    months,
    goals: goals.map((g) => ({ id: g.id, name: g.name, domain: g.domainId })),
  })

  return NextResponse.json({
    asOf: quarter.asOf,
    dayMaster: natal.dayMaster,
    dayElement,
    strength,
    favorable: quarter.favorable,
    unfavorable: quarter.unfavorable,
    favorableBasis: quarter.favorableBasis,
    months: quarter.months,
    goals: quarter.goals,
  })
}
