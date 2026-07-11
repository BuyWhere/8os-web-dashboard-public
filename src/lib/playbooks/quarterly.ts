/**
 * src/lib/playbooks/quarterly.ts — the Quarterly (12-week cycle) playbook (E-3, §3.4).
 *
 * Fires on the 12-week cycle boundary (onQuarterBoundary), keyed
 * `{userId}:quarterly:{cycleIndex}` by the heartbeat tick. Content contract:
 * cycle retro (goals fed vs starving over 12 weeks) → next-cycle themes paced to
 * favorable months. Primary action: commit next cycle's 1–3 goals.
 *
 * The retro reads the REAL 84-day ledger via computeAlignment(days:60 capped) +
 * a direct ledger sweep; the next-cycle themes come from computeQuarter's
 * per-month verdicts (real 流月 method). Delivered via the governor.
 */
import { assembleAgentContext } from '@/lib/agent-context'
import { computeAlignment } from '@/lib/alignment-engine'
import type { ChannelAction, ChannelMessage } from '@/lib/channels/types'
import {
  decodeUserPhases, callGenerateCoaching, deliverRhythm,
  getBehaviorTokensSafe, type RhythmRunResult,
} from './rhythm-shared'
import { prisma } from '@/lib/db/prisma'

interface CycleGoalStat { goalId: string; name: string; domainId: string; weight: number }

export async function runQuarterly(
  userId: string,
  opts: { runId?: string; at?: Date } = {},
): Promise<RhythmRunResult> {
  const at = opts.at ?? new Date()
  try {
    const context = await assembleAgentContext(userId, 'quarterly')
    const decoded = await decodeUserPhases(userId, at)
    const alignment = await computeAlignment(userId, { days: 60 }).catch(() => null)
    const tokens = await getBehaviorTokensSafe(userId)

    // ── Cycle retro: fed vs starving over the 12-week (84-day) window ─────────
    const cycle = await cycleLedger(userId, at, 84)
    const fed = cycle.filter((c) => c.weight > 0).sort((a, b) => b.weight - a.weight)
    const starving = cycle.filter((c) => c.weight === 0)
    const totalWeight = cycle.reduce((s, c) => s + c.weight, 0)
    const retroLines = fed.slice(0, 4).map((c) =>
      `“${c.name}” took ${totalWeight > 0 ? Math.round((c.weight / totalWeight) * 100) : 0}% of your tracked attention this cycle`,
    )
    const starvingLine = starving.length
      ? `Fed nothing this cycle: ${starving.slice(0, 4).map((c) => `“${c.name}”`).join(', ')}.`
      : ''

    // ── Next-cycle themes paced to favorable months (computeQuarter) ──────────
    const months = decoded?.quarter.months ?? []
    const themeLines = months.map((m) =>
      `${m.label} — ${m.mode === 'push' ? 'green-light' : m.mode === 'consolidate' ? 'consolidate' : 'steady'} (${m.pillar})${m.favorableDomains.length ? `, best for ${m.favorableDomains.slice(0, 3).join(', ')}` : ''}`,
    )
    const pushMonths = months.filter((m) => m.mode === 'push').map((m) => m.label)

    const fallbackBody = [
      `12-week cycle retro:`,
      ...(retroLines.length ? retroLines.map((l) => `- ${l}`) : ['- No tracked attention this cycle — the next 12 weeks are a fresh start.']),
      ...(starvingLine ? [starvingLine] : []),
      '',
      'Next cycle, paced to your chart:',
      ...(themeLines.length ? themeLines.map((l) => `- ${l}`) : ['- Keep momentum on your top 1–3 goals.']),
      pushMonths.length ? `\nYour green-light months are ${pushMonths.join(', ')} — set your boldest milestone there.` : '',
      '',
      'Commit your 1–3 goals for the next cycle to lock the plan in.',
    ].filter(Boolean).join('\n')

    const instruction = [
      'Write this user\'s QUARTERLY (12-week cycle) review. Structure, in order:',
      `1) A cycle retro with real receipts — which goals were FED vs STARVING over 12 weeks: ${retroLines.join('; ') || 'no tracked attention this cycle'}. ${starvingLine}`,
      themeLines.length ? `2) Next-cycle themes paced to their favorable months (name the pillars/modes): ${themeLines.join('; ')}.` : '',
      pushMonths.length ? `Their green-light (push) months are ${pushMonths.join(', ')}.` : '',
      'End with a single directional nudge to commit their next cycle\'s 1–3 goals. ONE primary action only.',
      tokens?.tone ? `Tone: ${tokens.tone}.` : '',
    ].filter(Boolean).join('\n')

    const gen = await callGenerateCoaching({ context, instruction, fallbackBody })

    const actions: ChannelAction[] = [
      { id: 'link:/dashboard/quarter?commit=cycle', label: 'Commit next cycle\'s goals' },
    ]

    const message: ChannelMessage = {
      title: 'A new 12-week cycle',
      body: gen.body,
      actions,
      meta: {
        playbook: 'quarterly',
        proactive: true,
        fedGoalIds: fed.map((c) => c.goalId),
        starvingGoalIds: starving.map((c) => c.goalId),
        pushMonths,
      },
    }

    return deliverRhythm(userId, 'quarterly', message, gen, {
      runId: opts.runId, at,
      extraOutput: { fedGoalIds: fed.map((c) => c.goalId), starvingGoalIds: starving.map((c) => c.goalId), pushMonths },
    })
  } catch (e) {
    console.error('[quarterly] failed:', e)
    return { status: 'failed', reason: e instanceof Error ? e.message : String(e) }
  }
}

/** Per-active-goal blended weight over the last `days` days (ledger read). */
async function cycleLedger(userId: string, at: Date, days: number): Promise<CycleGoalStat[]> {
  const today = new Date(at.toISOString().slice(0, 10) + 'T00:00:00Z')
  const since = new Date(today.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10)
  const goals = await prisma.goal.findMany({
    where: { userId, status: 'active' }, select: { id: true, name: true, domainId: true },
  }).catch(() => [] as Array<{ id: string; name: string; domainId: string }>)
  const rows = await prisma.$queryRawUnsafe<{ goal_id: string | null; minutes: number; actions: number; mentions: number }[]>(
    `SELECT goal_id, SUM(minutes)::int AS minutes, SUM(actions)::int AS actions, SUM(mentions)::int AS mentions
       FROM attention_ledger WHERE user_id = $1 AND day >= $2::date GROUP BY goal_id`,
    userId, since,
  ).catch(() => [] as Array<{ goal_id: string | null; minutes: number; actions: number; mentions: number }>)
  const weightByGoal = new Map<string, number>()
  for (const r of rows) {
    if (!r.goal_id) continue
    weightByGoal.set(r.goal_id, (r.minutes ?? 0) * 0.5 + (r.actions ?? 0) * 0.3 + (r.mentions ?? 0) * 0.2)
  }
  return goals.map((g) => ({ goalId: g.id, name: g.name, domainId: g.domainId, weight: weightByGoal.get(g.id) ?? 0 }))
}
