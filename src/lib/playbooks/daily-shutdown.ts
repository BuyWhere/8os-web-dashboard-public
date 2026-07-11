/**
 * src/lib/playbooks/daily-shutdown.ts — the end-of-day shutdown playbook
 * (E-3, §3.4).
 *
 * Contract: done/incomplete recap → carry-to-tomorrow CTA → archetype
 * close-line. Primary action: carry-over confirm → /dashboard/shutdown.
 *
 * Recap numbers are REAL task data (done today / still-open-scheduled-today),
 * computed the same way /api/shutdown does (user-local day window). Generation
 * is under the §3.6 coaching policy; deterministic fallback if Flow AI is down.
 * Delivered through the governor (E-13); emits PostHog `shutdown_completed`.
 */
import { prisma } from '@/lib/db/prisma'
import { decrypt } from '@/lib/encryption'
import { calculateBazi } from '@/lib/bazi'
import { calculateDayMasterStrength } from '@/lib/bazi-strength'
import type { Stem, Branch } from '@/lib/bazi'
import { computePhases, type Element } from '@/lib/bazi-phases'
import { DEFAULT_TIMEZONE, isValidTimezone, userDayBounds } from '@/lib/user-time'
import { assembleAgentContext } from '@/lib/agent-context'
import { deliverProactive } from '@/lib/channels/governor'
import type { ChannelAction, ChannelMessage } from '@/lib/channels/types'
import { generateCoaching, captureBriefEvent } from './shared'
import type { PlaybookRunResult } from './daily-brief'

function closeLine(
  archetypeName: string | null,
  doneCount: number,
  incompleteCount: number,
  dayVerdict: 'favorable' | 'unfavorable' | 'neutral' | null,
): string {
  const who = archetypeName ? `${archetypeName}, ` : ''
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
  if (dayVerdict === 'favorable') return `${base} The day's transit was with you — let that carry into how you rest.`
  if (dayVerdict === 'unfavorable') return `${base} The day ran a touch choppy — all the more reason to close cleanly and not push past the line.`
  return base
}

export async function runDailyShutdown(
  userId: string,
  opts: { runId?: string; at?: Date } = {},
): Promise<PlaybookRunResult> {
  try {
    const now = opts.at ?? new Date()

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        birthDateEncrypted: true, birthTimeEncrypted: true,
        gender: true, dayElement: true, timezone: true,
      },
    })
    const timezone = isValidTimezone(profile?.timezone) ? (profile!.timezone as string) : DEFAULT_TIMEZONE
    const { start: todayStart, end: todayEnd } = userDayBounds(timezone, now)

    const [doneToday, incompleteToday, archetype] = await Promise.all([
      prisma.oSTask.findMany({
        where: { userId, completedAt: { gte: todayStart, lte: todayEnd } },
        select: { id: true, name: true },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.oSTask.findMany({
        where: { userId, scheduledAt: { gte: todayStart, lte: todayEnd }, status: { in: ['todo', 'in_progress'] } },
        select: { id: true, name: true },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.archetypeResult.findUnique({ where: { userId }, select: { archetypeName: true } }),
    ])

    // Day-layer tint (soft) — same decode path as /api/shutdown.
    let dayVerdict: 'favorable' | 'unfavorable' | 'neutral' | null = null
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
          dayElement, strength,
          monthStem: natal.monthPillar.stem as Stem,
          monthBranch: natal.monthPillar.branch as Branch,
          yearStem: natal.yearPillar.stem as Stem,
          dayBranch: natal.dayPillar.branch as Branch,
          gender: profile.gender, birth, now, timezone,
        })
        const dayLayer = phases.layers.find((l) => l.key === 'day')
        if (dayLayer) dayVerdict = dayLayer.verdict
      } catch (e) {
        console.error('[daily-shutdown] phase decode failed:', e)
      }
    }

    const archetypeName = archetype?.archetypeName ?? null
    const doneCount = doneToday.length
    const incompleteCount = incompleteToday.length
    const close = closeLine(archetypeName, doneCount, incompleteCount, dayVerdict)

    const recapLine = `Today: ${doneCount} done, ${incompleteCount} still open.`
    const incompleteList = incompleteCount
      ? incompleteToday.slice(0, 5).map((t) => `• ${t.name}`).join('\n')
      : ''

    // E-9 mood loop: a light 1-tap mood + energy ask (1-5). ~2s of friction.
    // From the shutdown SURFACE the taps upsert POST /api/mood; from this inbox
    // message a reply of the form `mood:<1-5>:<1-5>` can log it later (renderer
    // note - the Telegram/inbox action handler maps that token to POST /api/mood
    // with source='telegram'). The agent NEVER comments on the value it receives.
    const moodAsk = "Before you close: how was today? Tap a mood (1-5) and an energy (1-5) on the shutdown page - two taps, that's it."

    const fallbackBody = [
      recapLine,
      incompleteCount ? `\nStill open:\n${incompleteList}` : '',
      `\n${close}`,
      `\n${moodAsk}`,
    ].filter(Boolean).join('\n')

    const context = await assembleAgentContext(userId, 'daily_shutdown')
    const instruction = [
      'Write this user\'s END-OF-DAY SHUTDOWN message. Structure, in this order:',
      `1) A recap using the real counts: ${recapLine}`,
      incompleteCount ? `2) The incomplete items to carry to tomorrow:\n${incompleteList}` : '2) Nothing left open — acknowledge a clean close.',
      `3) One archetype-voiced close line (use verbatim or lightly): ${close}`,
      `4) A brief mood ask, observational and light, do NOT comment on how they might feel: ${moodAsk}`,
      'End pointing at the single carry-over confirm action. One action only.',
    ].join('\n')

    const gen = await generateCoaching({ context, instruction, fallbackBody })

    const actions: ChannelAction[] = [
      { id: 'link:/dashboard/shutdown', label: incompleteCount ? 'Carry to tomorrow' : 'Close the day' },
    ]

    const message: ChannelMessage = {
      title: 'Shutdown',
      body: gen.body,
      actions,
      meta: {
        playbook: 'daily_shutdown',
        doneCount, incompleteCount,
        incompleteIds: incompleteToday.map((t) => t.id),
      },
    }

    const gov = await deliverProactive(userId, message, {
      kind: 'daily_shutdown', runId: opts.runId, at: opts.at,
    })

    if (gov.suppressed) {
      return { status: 'skipped', reason: gov.reason, usedLlm: gen.usedLlm, body: gen.body }
    }

    await captureBriefEvent(userId, 'shutdown_completed', {
      kind: 'daily_shutdown',
      done_count: doneCount,
      incomplete_count: incompleteCount,
      inbox_message_id: gov.outcome?.inboxMessageId ?? null,
      used_llm: gen.usedLlm,
    })

    return {
      status: 'done',
      inboxMessageId: gov.outcome?.inboxMessageId ?? null,
      usedLlm: gen.usedLlm,
      body: gen.body,
      tokenCost: gen.tokenCost,
    }
  } catch (e) {
    console.error('[daily-shutdown] failed:', e)
    return { status: 'failed', reason: e instanceof Error ? e.message : String(e) }
  }
}
