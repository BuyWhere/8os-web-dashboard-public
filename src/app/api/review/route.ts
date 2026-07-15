/**
 * GET /api/review
 * Authed (Clerk requireAuth, userId-scoped). Data path for the Weekly Review +
 * Preview ritual (/dashboard/review). Two parts, both from REAL data:
 *
 *  REVIEW  (last 7 days):
 *    - completed: OSTask with completedAt in the last 7 days
 *    - planned:   OSTask that were scheduled into the last-7-day window
 *                 (scheduledAt in window) OR completed in it — i.e. what the
 *                 week was meant to contain
 *    - carryOver: scheduled in the window (or earlier) but still not done
 *                 / not cancelled — the unfinished tasks rolling forward
 *    - goalDeltas: per active goal, current progress + tasks completed this
 *                  week that belong to it (a real, attributable delta)
 *
 *  PREVIEW (next 7 days):
 *    - the active MONTH-pillar theme (流月) + WEEK derivation, pulled from the
 *      same phase engine that powers /api/phases (NO duplicated metaphysics)
 *    - frames the week as a "build" / "consolidate" / "mixed" week from the
 *      month-layer verdict
 *    - favorableGoals: the user's active goals whose Ten-Gods domain element is
 *      currently FAVORABLE (so "set this week's focus" can prioritise them)
 *
 * Reflection: persisted as a JournalEntry (kind=weekly_reflection) — the page
 * POSTs it to /api/journal; this endpoint just supplies the prompt.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { decrypt } from '@/lib/encryption'
import { calculateBazi } from '@/lib/bazi'
import { calculateDayMasterStrength } from '@/lib/bazi-strength'
import type { Stem, Branch } from '@/lib/bazi'
import { computePhases, goalTagline, type Element, type GoalDomain } from '@/lib/bazi-phases'

const WEEK_MS = 7 * 86400000

function weekFrame(verdict: 'favorable' | 'unfavorable' | 'neutral'): string {
  if (verdict === 'favorable') return 'a build week'
  if (verdict === 'unfavorable') return 'a consolidate week'
  return 'a steady week'
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  const now = new Date()
  const weekAgo = new Date(now.getTime() - WEEK_MS)
  const weekAhead = new Date(now.getTime() + WEEK_MS)

  // ── REVIEW: real task data over the last 7 days ───────────────────────────
  const [completed, plannedInWindow, carryOver, activeGoals] = await Promise.all([
    // Completed in the last 7 days
    prisma.oSTask.findMany({
      where: { userId, completedAt: { gte: weekAgo, lte: now } },
      select: { id: true, name: true, completedAt: true, goalId: true, domainId: true, priority: true },
      orderBy: { completedAt: 'desc' },
    }),
    // Planned/scheduled INTO the last-7-day window (what the week was meant to hold)
    prisma.oSTask.findMany({
      where: {
        userId,
        scheduledAt: { gte: weekAgo, lte: now },
        status: { not: 'cancelled' },
      },
      select: { id: true, name: true, status: true, scheduledAt: true, completedAt: true, domainId: true, priority: true },
    }),
    // Carry-over: was due on/before now (scheduled in the past, incl. this window)
    // but still not done and not cancelled → unfinished, rolls forward
    prisma.oSTask.findMany({
      where: {
        userId,
        scheduledAt: { lte: now },
        status: { in: ['todo', 'in_progress'] },
      },
      select: { id: true, name: true, status: true, scheduledAt: true, domainId: true, priority: true },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.goal.findMany({
      where: { userId, status: 'active' },
      select: { id: true, name: true, domainId: true, progress: true },
      orderBy: { createdAt: 'asc' },
      take: 20,
    }),
  ])

  const completedCount = completed.length
  // "planned" = the union of tasks scheduled into the window + tasks completed
  // in the window (a task completed but scheduled earlier still counts as work
  // the week delivered). De-dupe by id.
  const plannedIds = new Set<string>(plannedInWindow.map((t) => t.id))
  for (const t of completed) plannedIds.add(t.id)
  const plannedCount = plannedIds.size

  // Goal deltas: how many of THIS week's completions belong to each goal.
  const completedByGoal = new Map<string, number>()
  for (const t of completed) {
    if (t.goalId) completedByGoal.set(t.goalId, (completedByGoal.get(t.goalId) ?? 0) + 1)
  }

  // ── PREVIEW: pull the live phase engine (same method as /api/phases) ───────
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      birthDateEncrypted: true, birthTimeEncrypted: true,
      gender: true, dayElement: true,
    },
  })

  let preview: Record<string, unknown> = { available: false, reason: 'No birth profile, complete onboarding first.' }
  let goalDeltas = activeGoals.map((g) => ({
    goalId: g.id, name: g.name, domain: g.domainId,
    progress: g.progress, completedThisWeek: completedByGoal.get(g.id) ?? 0,
    favorableNow: null as boolean | null, verdict: null as string | null, tagline: null as string | null,
  }))

  if (profile) {
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
        gender: profile.gender, birth, now,
      })

      const monthLayer = phases.layers.find((l) => l.key === 'month')!
      const weekLayer = phases.layers.find((l) => l.key === 'week')!

      // Per-goal favorability via the same Ten-Gods tagline engine used by /api/phases.
      const taglines = activeGoals.map((g) => {
        const tg = goalTagline(g.domainId as GoalDomain, dayElement, strength, now, phases.luck)
        return { goalId: g.id, verdict: tg.overall, tagline: tg.tagline }
      })
      const tgById = new Map(taglines.map((t) => [t.goalId, t]))

      goalDeltas = activeGoals.map((g) => {
        const tg = tgById.get(g.id)
        return {
          goalId: g.id, name: g.name, domain: g.domainId,
          progress: g.progress, completedThisWeek: completedByGoal.get(g.id) ?? 0,
          favorableNow: tg ? tg.verdict === 'favorable' : null,
          verdict: tg?.verdict ?? null, tagline: tg?.tagline ?? null,
        }
      })

      const favorableGoals = goalDeltas.filter((g) => g.favorableNow)

      preview = {
        available: true,
        weekFrame: `This week is ${weekFrame(monthLayer.verdict)}, inherited from your active month pillar.`,
        monthPillar: monthLayer.pillar,
        monthBasis: monthLayer.basis,
        monthVerdict: monthLayer.verdict,
        monthGuidance: monthLayer.guidance,
        weekGuidance: weekLayer.guidance,
        weekBasis: weekLayer.basis,
        favorable: phases.favorable.favorable,
        unfavorable: phases.favorable.unfavorable,
        favorableGoals: favorableGoals.map((g) => ({
          goalId: g.goalId, name: g.name, domain: g.domain, tagline: g.tagline,
        })),
      }
    } catch (e) {
      console.error('[review] phase compute failed:', e)
      preview = { available: false, reason: 'Could not read birth data for the phase preview.' }
    }
  }

  return NextResponse.json({
    asOf: now.toISOString(),
    window: { from: weekAgo.toISOString(), to: now.toISOString() },
    nextWindow: { from: now.toISOString(), to: weekAhead.toISOString() },
    review: {
      completedCount,
      plannedCount,
      completionRate: plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : null,
      completed: completed.map((t) => ({
        id: t.id, name: t.name, completedAt: t.completedAt, domain: t.domainId, priority: t.priority,
      })),
      carryOver: carryOver.map((t) => ({
        id: t.id, name: t.name, status: t.status, scheduledAt: t.scheduledAt, domain: t.domainId, priority: t.priority,
      })),
      carryOverCount: carryOver.length,
      goalDeltas,
    },
    // Reflection persists via POST /api/journal (kind=weekly_reflection).
    reflection: { persisted: true, prompt: 'What went well this week, and what one thing will you change next week?' },
    preview,
  })
}
