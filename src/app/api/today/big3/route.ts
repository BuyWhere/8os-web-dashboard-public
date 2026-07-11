/**
 * GET /api/today/big3  — Daily Big 3 (OS-2164)
 *
 * Suggests THREE priority tasks for today, BIASED toward tasks/goals whose domain
 * maps to the user's currently-favorable elements. The domain↔element mapping and
 * the favorable-element verdict are reused verbatim from the BaZi phase engine
 * (src/lib/bazi-phases.ts: DOMAIN_TEN_GOD + tenGodElement + verdictFor via
 * domainFavorability) — NO new metaphysics is invented here, and the engine
 * internals are not touched.
 *
 * Honesty framing (docs A.4 / A.6): the day layer is a GENTLE soft tint, not a
 * hard rule, and there are NO energy-hours. We surface the day's soft-tint line
 * straight from the same compute that powers /api/phases.
 *
 * Reuses verified data only: the user's own goals + open tasks (same models the
 * dashboard reads). Accepting / swapping is done client-side via the existing
 * /api/schedule + /api/tasks endpoints — this route is read-only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { decrypt } from '@/lib/encryption'
import { calculateBazi } from '@/lib/bazi'
import { calculateDayMasterStrength } from '@/lib/bazi-strength'
import type { Stem, Branch } from '@/lib/bazi'
import {
  computePhases, domainFavorability, ELEMENT_EN,
  type Element, type GoalDomain, type Verdict,
} from '@/lib/bazi-phases'
import { DEFAULT_TIMEZONE, isValidTimezone, userDayBounds, userLocalDate } from '@/lib/user-time'

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

// Scoring weights: a favorable domain dominates priority so the Big 3 genuinely
// OVER-WEIGHT favorable-domain work; priority + scheduled-today break ties.
const W_FAVORABLE = 100
const W_NEUTRAL = 40
const W_UNFAVORABLE = 0

interface Candidate {
  id: string
  name: string
  domainId: string | null
  priority: string
  duration: number
  scheduledAt: string | null
  goalName: string | null
  favorVerdict: Verdict | null
  domainElement: string | null
  score: number
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId
  const now = new Date()

  // ── Phase / favorable-domain map (same method as /api/phases) ──────────────
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      birthDateEncrypted: true, birthTimeEncrypted: true,
      gender: true, dayElement: true, timezone: true,
    },
  })
  if (!profile) {
    return NextResponse.json({ error: 'No birth profile — complete onboarding first.' }, { status: 404 })
  }
  // E-0 (OS-2651): "today" = the user's local day, not the server's.
  const timezone = isValidTimezone(profile.timezone) ? profile.timezone : DEFAULT_TIMEZONE

  let favorMap: Record<string, { domain: string; tenGod: string; element: string; verdict: Verdict }> = {}
  let favorableDomainList: string[] = []
  let dayTint: { verdict: Verdict; line: string; pillar: string | null } = { verdict: 'neutral', line: '', pillar: null }
  let favorableElements: string[] = []

  try {
    const birthDate = decrypt(profile.birthDateEncrypted)
    const birthTime = profile.birthTimeEncrypted ? decrypt(profile.birthTimeEncrypted) : null
    const [y, m, d] = birthDate.split('-').map(Number)
    const [hh, mm] = birthTime ? birthTime.split(':').map(Number) : [12, 0]

    const natal = calculateBazi(y, m, d, hh, mm)
    const strength = calculateDayMasterStrength(natal).strength
    const monthStem = natal.monthPillar.stem as Stem
    const monthBranch = natal.monthPillar.branch as Branch
    const yearStem = natal.yearPillar.stem as Stem
    const dayBranch = natal.dayPillar.branch as Branch
    const dayElement = (profile.dayElement || natal.dayElement) as Element
    const birth = new Date(Date.UTC(y, m - 1, d, hh, mm))

    const phases = computePhases({
      dayElement, strength, monthStem, monthBranch, yearStem, dayBranch,
      gender: profile.gender, birth, now, timezone,
    })
    favorableElements = phases.favorable.favorable.map((e) => ELEMENT_EN[e as Element] ?? e)

    const fm = domainFavorability(dayElement, strength)
    favorMap = Object.fromEntries(
      Object.entries(fm).map(([k, v]) => [k, {
        domain: v.domain, tenGod: v.tenGod, element: ELEMENT_EN[v.element], verdict: v.verdict,
      }]),
    )
    favorableDomainList = Object.values(fm).filter((v) => v.verdict === 'favorable').map((v) => v.domain)

    // Day layer — the soft tint (A.4): gentle orientation, NOT a hard rule.
    const dayLayer = phases.layers.find((l) => l.key === 'day')
    if (dayLayer) dayTint = { verdict: dayLayer.verdict, line: dayLayer.guidance, pillar: dayLayer.pillar }
  } catch (e) {
    console.error('[big3] phase compute failed:', e)
    return NextResponse.json({ error: 'Could not read birth data for the Big 3.' }, { status: 500 })
  }

  // ── Candidate tasks: today's open tasks + open backlog (todo / in_progress) ─
  const { start: todayStart, end: todayEnd } = userDayBounds(timezone, now)

  const tasks = await prisma.oSTask.findMany({
    where: {
      userId,
      status: { in: ['todo', 'in_progress'] },
      OR: [
        { scheduledAt: { gte: todayStart, lte: todayEnd } },
        { scheduledAt: null },
      ],
    },
    select: {
      id: true, name: true, domainId: true, priority: true, duration: true,
      scheduledAt: true, goalId: true,
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    take: 50,
  })

  // Resolve goal domain for tasks that only carry a goalId (fallback for domain).
  const goalIds = Array.from(new Set(tasks.map((t) => t.goalId).filter(Boolean))) as string[]
  const goals = goalIds.length
    ? await prisma.goal.findMany({ where: { id: { in: goalIds }, userId }, select: { id: true, name: true, domainId: true } })
    : []
  const goalById = new Map(goals.map((g) => [g.id, g]))

  const candidates: Candidate[] = tasks.map((t) => {
    const g = t.goalId ? goalById.get(t.goalId) : undefined
    const domain = (t.domainId || g?.domainId || null) as string | null
    const fav = domain ? favorMap[domain] : undefined
    const verdict: Verdict | null = fav ? fav.verdict : null
    const domainW = verdict === 'favorable' ? W_FAVORABLE : verdict === 'unfavorable' ? W_UNFAVORABLE : W_NEUTRAL
    // priority adds a small tiebreak (high=+6, medium=+3, low=0); scheduled-today nudges up.
    const priorityW = (3 - (PRIORITY_RANK[t.priority] ?? 1)) * 3
    const scheduledW = t.scheduledAt ? 4 : 0
    return {
      id: t.id, name: t.name, domainId: domain, priority: t.priority,
      duration: t.duration, scheduledAt: t.scheduledAt ? t.scheduledAt.toISOString() : null,
      goalName: g?.name ?? null,
      favorVerdict: verdict,
      domainElement: fav ? fav.element : null,
      score: domainW + priorityW + scheduledW,
    }
  })

  candidates.sort((a, b) =>
    b.score - a.score ||
    (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
    a.name.localeCompare(b.name),
  )

  const big3 = candidates.slice(0, 3)
  const alternates = candidates.slice(3) // pool for "swap one out"

  // ── "Why these" rationale, tied to the favorable domains ───────────────────
  const favLabels = favorableDomainList.map(cap)
  let rationale: string
  const favInBig3 = big3.filter((c) => c.favorVerdict === 'favorable').length
  if (favLabels.length && favInBig3 > 0) {
    rationale = `Weighted toward your favorable domain${favLabels.length > 1 ? 's' : ''} right now — ${favLabels.join(' & ')} (${favorableElements.join(', ')}) — where effort compounds. ${favInBig3} of today's three sit there.`
  } else if (favLabels.length) {
    rationale = `Your favorable domain${favLabels.length > 1 ? 's' : ''} right now ${favLabels.length > 1 ? 'are' : 'is'} ${favLabels.join(' & ')} (${favorableElements.join(', ')}) — add a task there to ride the tailwind. For now these are your highest-leverage open items.`
  } else {
    rationale = `A steady day — no domain is strongly favored. These are your highest-priority open items.`
  }

  return NextResponse.json({
    asOf: userLocalDate(timezone, now).iso,
    timezone,
    favorableElements,
    favorableDomains: favorableDomainList,
    domainFavor: favorMap,
    dayTint, // soft, gentle orientation — NOT a hard rule, no energy-hours
    rationale,
    big3,
    alternates,
    counts: { candidates: candidates.length, favorableInBig3: favInBig3 },
  })
}
