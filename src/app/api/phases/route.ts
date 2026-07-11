/**
 * GET /api/phases
 * Authed (Clerk requireAuth, userId-scoped). Returns the 5-layer BaZi phase
 * guidance for the signed-in user as of today (大运 / 流年 / 流月 / derived week / 日),
 * plus the derived favorable/unfavorable elements and the active Luck Pillar.
 *
 * Method per docs/BAZI-PHASES-AND-PLANNER-RESEARCH.md (Part A).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { decrypt } from '@/lib/encryption'
import { calculateBazi } from '@/lib/bazi'
import { calculateDayMasterStrength } from '@/lib/bazi-strength'
import type { Stem, Branch } from '@/lib/bazi'
import { computePhases, goalTagline, type Element, type GoalDomain } from '@/lib/bazi-phases'
import { DEFAULT_TIMEZONE, isValidTimezone, userLocalDayUTC } from '@/lib/user-time'
import { captureServerException } from '@/lib/error-track'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      birthDateEncrypted: true, birthTimeEncrypted: true,
      gender: true, dayElement: true,
      yearPillar: true, monthPillar: true, dayPillar: true,
      timezone: true,
    },
  })
  if (!profile) {
    return NextResponse.json({ error: 'No birth profile — complete onboarding first.' }, { status: 404 })
  }

  // Decrypt birth date/time to get a precise birth moment for the luck-pillar start age.
  let birthDate: string
  let birthTime: string | null = null
  try {
    birthDate = decrypt(profile.birthDateEncrypted)
    if (profile.birthTimeEncrypted) birthTime = decrypt(profile.birthTimeEncrypted)
  } catch (e) {
    console.error('[phases] decrypt failed:', e)
    captureServerException(e, { route: '/api/phases', userId, extra: { phase: 'decrypt' } })
    return NextResponse.json({ error: 'Could not read birth data.' }, { status: 500 })
  }

  const [y, m, d] = birthDate.split('-').map(Number)
  const [hh, mm] = birthTime ? birthTime.split(':').map(Number) : [12, 0]

  // Recompute the natal chart to get Day Master strength + parse pillars.
  const natal = calculateBazi(y, m, d, hh, mm)
  const strength = calculateDayMasterStrength(natal).strength

  const monthStem = natal.monthPillar.stem as Stem
  const monthBranch = natal.monthPillar.branch as Branch
  const yearStem = natal.yearPillar.stem as Stem
  const dayBranch = natal.dayPillar.branch as Branch
  const dayElement = (profile.dayElement || natal.dayElement) as Element

  const birth = new Date(Date.UTC(y, m - 1, d, hh, mm))
  const now = new Date()
  // E-0 (OS-2651): "today" = the user's local civil date, not the server's.
  const timezone = isValidTimezone(profile.timezone) ? profile.timezone : DEFAULT_TIMEZONE

  const phases = computePhases({
    dayElement, strength,
    monthStem, monthBranch, yearStem, dayBranch,
    gender: profile.gender, birth, now, timezone,
  })

  // Enrich the user's active goals with a Ten-Gods tagline.
  const goals = await prisma.goal.findMany({
    where: { userId, status: 'active' },
    select: { id: true, name: true, domainId: true },
    orderBy: { createdAt: 'asc' },
    take: 20,
  }).catch(() => [])

  const localToday = userLocalDayUTC(timezone, now)
  const goalTaglines = goals.map((g) => {
    const tg = goalTagline(g.domainId as GoalDomain, dayElement, strength, localToday, phases.luck)
    return {
      goalId: g.id, name: g.name, domain: g.domainId,
      tenGod: tg.tenGod, domainElement: tg.domainElement,
      verdict: tg.overall, tagline: tg.tagline,
    }
  })

  return NextResponse.json({
    asOf: phases.asOf,
    timezone,
    dayMaster: natal.dayMaster,
    dayElement,
    strength,
    favorable: phases.favorable.favorable,
    unfavorable: phases.favorable.unfavorable,
    favorableBasis: phases.favorable.basis,
    luckPillar: phases.luck.current ? {
      pillar: phases.luck.current.combined,
      direction: phases.luck.direction,
      startAge: { years: phases.luck.startAgeYears, months: phases.luck.startAgeMonths },
      activeHalf: phases.luck.activeHalf,
      yearsRemaining: Math.round(phases.luck.yearsRemainingInPillar * 10) / 10,
      index: phases.luck.current.index,
    } : { pillar: null, direction: phases.luck.direction, startAge: { years: phases.luck.startAgeYears, months: phases.luck.startAgeMonths } },
    layers: phases.layers,
    goalTaglines,
  })
}
