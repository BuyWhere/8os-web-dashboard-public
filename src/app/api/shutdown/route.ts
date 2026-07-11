/**
 * GET /api/shutdown
 * Authed (Clerk requireAuth, userId-scoped). Data path for the end-of-day
 * "shutdown" ritual (/dashboard/shutdown). All numbers are REAL task data:
 *
 *   DONE today       — OSTask with completedAt within today (local day window)
 *   INCOMPLETE today — OSTask scheduled into today (scheduledAt within today)
 *                      still in todo / in_progress (not done, not cancelled)
 *                      → the tasks that would otherwise just vanish at day's end
 *
 * Both lists + counts come straight from prisma; nothing is synthesised.
 *
 * The close-the-day line is voiced by the user's archetype and tinted by the
 * DAY-layer transit (日, the weakest BaZi signal — a gentle tint, never a
 * mandate; doc §A.4) from the same phase engine that powers /api/phases and
 * /api/review. If there's no birth profile / archetype it degrades to a plain
 * encouraging line — it never fabricates metaphysics.
 *
 * Reflection: NO JournalEntry/Note model exists in the schema, so this endpoint
 * does NOT persist reflections. The page renders the prompt and says so.
 *
 * The "carry incomplete to tomorrow" action is NOT here — it reuses the existing
 * POST /api/schedule (searchFrom = tomorrow 00:00) from the page, one call per
 * task, so no new scheduling logic is introduced.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { decrypt } from '@/lib/encryption'
import { calculateBazi } from '@/lib/bazi'
import { calculateDayMasterStrength } from '@/lib/bazi-strength'
import type { Stem, Branch } from '@/lib/bazi'
import { computePhases, type Element } from '@/lib/bazi-phases'

// A short, archetype-voiced close-the-day line, tinted by the day-layer verdict.
// The verdict is the gentle daily transit tint (doc §A.4) — kept soft on purpose.
function closeLine(
  archetypeName: string | null,
  doneCount: number,
  incompleteCount: number,
  dayVerdict: 'favorable' | 'unfavorable' | 'neutral' | null,
): string {
  const who = archetypeName ? `${archetypeName}, ` : ''
  // Base sentence from what actually happened today.
  let base: string
  if (doneCount === 0 && incompleteCount === 0) {
    base = `${who}a quiet day — nothing logged. Rest counts too; tomorrow is a fresh page.`
  } else if (incompleteCount === 0) {
    base = `${who}you closed every open loop today — ${doneCount} done, nothing left hanging. Shut the laptop with a clear conscience.`
  } else if (doneCount === 0) {
    base = `${who}${incompleteCount} still open and a slow start — carry them to tomorrow and let today end. Momentum returns with the next sunrise.`
  } else {
    base = `${who}${doneCount} done, ${incompleteCount} still open. Honest day's work — carry the rest forward and stop here.`
  }
  // Day-layer tint (soft, never a rule).
  if (dayVerdict === 'favorable') return `${base} The day's transit was with you — let that carry into how you rest.`
  if (dayVerdict === 'unfavorable') return `${base} The day ran a touch choppy — all the more reason to close cleanly and not push past the line.`
  return base
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)

  // ── REAL task data for today ──────────────────────────────────────────────
  const [doneToday, incompleteToday, archetype] = await Promise.all([
    // DONE today: completed within today's local window.
    prisma.oSTask.findMany({
      where: { userId, completedAt: { gte: todayStart, lte: todayEnd } },
      select: { id: true, name: true, completedAt: true, domainId: true, priority: true, duration: true },
      orderBy: { completedAt: 'desc' },
    }),
    // INCOMPLETE today: scheduled into today but still not done / not cancelled.
    prisma.oSTask.findMany({
      where: {
        userId,
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: { in: ['todo', 'in_progress'] },
      },
      select: { id: true, name: true, status: true, scheduledAt: true, domainId: true, priority: true, duration: true },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.archetypeResult.findUnique({
      where: { userId },
      select: { archetypeName: true },
    }),
  ])

  // ── Day-layer tint via the live phase engine (same method as /api/phases) ──
  // Optional & soft: if no profile, the close line just omits the tint.
  let dayVerdict: 'favorable' | 'unfavorable' | 'neutral' | null = null
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      birthDateEncrypted: true, birthTimeEncrypted: true,
      gender: true, dayElement: true,
    },
  })
  if (profile) {
    try {
      const birthDate = decrypt(profile.birthDateEncrypted)
      const birthTime = profile.birthTimeEncrypted ? decrypt(profile.birthTimeEncrypted) : null
      const [y, m, d] = birthDate.split('-').map(Number)
      const [hh, mm] = birthTime ? birthTime.split(':').map(Number) : [12, 0]

      const natal = calculateBazi(y, m, d, hh, mm)
      const strength = calculateDayMasterStrength(natal).strength
      const dayElement = (profile.dayElement || natal.dayElement) as Element
      const birth = new Date(Date.UTC(y, m - 1, d, hh, mm))

      const phases = computePhases({
        dayElement,
        strength,
        monthStem: natal.monthPillar.stem as Stem,
        monthBranch: natal.monthPillar.branch as Branch,
        yearStem: natal.yearPillar.stem as Stem,
        dayBranch: natal.dayPillar.branch as Branch,
        gender: profile.gender,
        birth,
        now,
      })
      const dayLayer = phases.layers.find((l) => l.key === 'day')
      if (dayLayer) dayVerdict = dayLayer.verdict
    } catch (e) {
      console.error('[shutdown] phase compute failed:', e)
      // soft-fail: leave dayVerdict null, close line still renders.
    }
  }

  const archetypeName = archetype?.archetypeName ?? null

  return NextResponse.json({
    asOf: now.toISOString(),
    window: { from: todayStart.toISOString(), to: todayEnd.toISOString() },
    doneCount: doneToday.length,
    incompleteCount: incompleteToday.length,
    done: doneToday.map((t) => ({
      id: t.id, name: t.name, completedAt: t.completedAt, domain: t.domainId,
      priority: t.priority, duration: t.duration,
    })),
    incomplete: incompleteToday.map((t) => ({
      id: t.id, name: t.name, status: t.status, scheduledAt: t.scheduledAt,
      domain: t.domainId, priority: t.priority, duration: t.duration,
    })),
    // Reflection is NOT persisted — no JournalEntry/Note model exists in the schema.
    reflection: {
      persisted: false,
      prompt: 'What is one thing that went well today, and what will you let go of before tomorrow?',
    },
    close: {
      archetypeName,
      dayVerdict,
      line: closeLine(archetypeName, doneToday.length, incompleteToday.length, dayVerdict),
    },
  })
}
