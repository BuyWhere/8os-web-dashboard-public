/**
 * src/lib/playbooks/weekly.ts — the Weekly Review playbook (E-3, §3.4).
 *
 * Content contract (spec table): alignment verdict + share-vs-priority deltas →
 * commitment sweep (overdue surfaced >2× in dailies) → next week framed by 流月
 * → one shareable verdict card. It ALSO hosts the E-10 goal-hygiene
 * confrontation (§5): any top-priority goal starved <5% for 21 days is
 * confronted here with the three operable outcomes.
 *
 * Primary action (§3.4): accept next week's #1 focus block — a redirection
 * proposal via E-7's ensureProposal (points at the starving-#1 goal).
 *
 * Every number is a REAL receipt from computeAlignment / the ledger. Delivered
 * through the governor (E-13). Idempotency (kind `weekly`, key
 * `{userId}:weekly:{isoWeek}`) is owned by the heartbeat tick.
 */
import { assembleAgentContext } from '@/lib/agent-context'
import { computeAlignment } from '@/lib/alignment-engine'
import { ensureProposal } from '@/lib/redirections'
import type { ChannelAction, ChannelMessage } from '@/lib/channels/types'
import {
  decodeUserPhases, layer, callGenerateCoaching, deliverRhythm, localISO,
  getBehaviorTokensSafe, type RhythmRunResult,
} from './rhythm-shared'
import { detectStarvingGoals } from '@/lib/goal-hygiene'
import { prisma } from '@/lib/db/prisma'

export async function runWeekly(
  userId: string,
  opts: { runId?: string; at?: Date } = {},
): Promise<RhythmRunResult> {
  const at = opts.at ?? new Date()
  try {
    const context = await assembleAgentContext(userId, 'weekly')
    const decoded = await decodeUserPhases(userId, at)
    const alignment = await computeAlignment(userId, { days: 7 }).catch(() => null)
    const starving = await detectStarvingGoals(userId, { at }).catch(() => [])
    const tokens = await getBehaviorTokensSafe(userId)

    // ── Alignment verdict + share-vs-priority deltas (real receipts) ──────────
    const perGoal = alignment ? [...alignment.weekly.perGoal].sort((a, b) => a.rank - b.rank) : []
    const trackedMin = perGoal.reduce((s, g) => s + g.minutes, 0)
    const verdict = alignment?.weekly.headline || context.state.alignmentHeadline || 'No tracked attention this week yet, next week is a clean slate.'
    const deltaLines = perGoal.slice(0, 4).map((g) => {
      const gap = Math.round((g.share - g.expectedShare) * 100)
      const sign = gap > 0 ? '+' : ''
      return `#${g.rank} ${g.name}: ${Math.round(g.share * 100)}% share vs ${Math.round(g.expectedShare * 100)}% priority-implied (${sign}${gap} pts, ${g.momentum})`
    })

    // ── Commitment sweep: overdue commitments surfaced >2× in dailies ─────────
    const sweep = await overdueSweep(userId)

    // ── Next week framed by the 流月 (the month layer's guidance) ─────────────
    const monthLayer = decoded ? layer(decoded.phases, 'month') : null
    const weekLayer = decoded ? layer(decoded.phases, 'week') : null
    const nextWeekLine = monthLayer
      ? `Next week sits inside ${monthLayer.pillar} (流月 ${monthLayer.label.toLowerCase()}): ${weekLayer?.guidance || monthLayer.guidance}`
      : 'Next week: keep momentum on your top priority; one focused block beats a scattered list.'

    // ── E-10 hygiene confrontation (hosted here) ──────────────────────────────
    const hygieneLines = starving.map((s) =>
      `“${s.name}” (your #${s.rank}) has held under ${Math.round(s.avgShare * 100)}% attention for ${s.windowDays} straight days. Recommit, shrink, or retire it?`,
    )

    // ── Deterministic fallback body (also the LLM's source of record) ─────────
    const fallbackBody = [
      `Weekly verdict: ${verdict}`,
      trackedMin ? `You tracked ${trackedMin} minutes across your goals this week.` : '',
      ...(deltaLines.length ? ['', 'Where your time went vs where you said it should:', ...deltaLines.map((l) => `- ${l}`)] : []),
      ...(sweep.length ? ['', 'These slipped past twice in your dailies, let\'s settle them:', ...sweep.map((c) => `- ${c.content}${c.dueIso ? ` (was due ${c.dueIso})` : ''}`)] : []),
      '',
      nextWeekLine,
      ...(hygieneLines.length ? ['', ...hygieneLines] : []),
    ].filter(Boolean).join('\n')

    const instruction = [
      'Write this user\'s WEEKLY REVIEW. Structure, in order:',
      `1) The alignment verdict for the week (one honest line, receipts): ${verdict}${trackedMin ? ` (${trackedMin} tracked minutes)` : ''}`,
      deltaLines.length ? `2) Their share-vs-priority deltas, stated as neutral facts:\n${deltaLines.join('\n')}` : '',
      sweep.length ? `3) Sweep the commitments that slipped past twice in their dailies (no guilt, just settle them): ${sweep.map((c) => `"${c.content}"`).join('; ')}.` : '',
      `4) Frame next week by their 流月: ${nextWeekLine}`,
      hygieneLines.length ? `5) Then confront the starving top-priority goal(s) plainly and WITHOUT shame, retiring is a WIN of focus, not a failure: ${starving.map((s) => `"${s.name}" at ${Math.round(s.avgShare * 100)}% for ${s.windowDays}d`).join('; ')}. Tell them the buttons let them recommit, shrink, or retire it.` : '',
      'End with a single directional nudge toward accepting next week\'s #1 focus block. ONE primary action only.',
      tokens?.tone ? `Tone: ${tokens.tone}.` : '',
    ].filter(Boolean).join('\n')

    const gen = await callGenerateCoaching({ context, instruction, fallbackBody })

    // ── The ONE primary action: accept next week's #1 focus block ─────────────
    // A redirection proposal targeting the starving-#1 goal (E-7). Prefer the
    // detector's flagged goal; otherwise the alignment engine's starving-#1.
    let proposalId: string | null = null
    try {
      const targetGoalId = starving[0]?.goalId
      const res = await ensureProposal(userId, {
        sourceKind: 'alignment',
        alignment: alignment ?? undefined,
        ...(targetGoalId ? { goalId: targetGoalId, rationale: `Lock next week's #1 focus block onto “${starving[0].name}”, it's been under-fed and it's your top priority.` } : {}),
        sourceRunId: opts.runId,
      })
      proposalId = res?.proposal.id ?? null
    } catch (e) {
      console.error('[weekly] ensureProposal failed:', e)
    }

    const actions: ChannelAction[] = proposalId
      ? [{ id: `rp:${proposalId}:accept`, label: 'Accept next week\'s #1 focus block' }]
      : [{ id: 'link:/dashboard/weekly', label: 'Set next week\'s focus' }]

    // E-10 hygiene choices attach as extra operable actions per flagged goal.
    for (const s of starving) {
      actions.push({ id: `gh:${s.goalId}:recommit`, label: `Recommit: ${trunc(s.name)}` })
      actions.push({ id: `gh:${s.goalId}:shrink`, label: `Shrink: ${trunc(s.name)}` })
      actions.push({ id: `gh:${s.goalId}:retire`, label: `Retire: ${trunc(s.name)}` })
    }

    // ── The shareable verdict card ────────────────────────────────────────────
    const topGoal = perGoal[0]
    const verdictCard = {
      headline: verdict,
      week: localISO(decoded?.timezone ?? 'UTC', at),
      trackedMinutes: trackedMin,
      topGoal: topGoal ? { name: topGoal.name, sharePct: Math.round(topGoal.share * 100), momentum: topGoal.momentum } : null,
      monthPillar: monthLayer?.pillar ?? null,
    }

    const message: ChannelMessage = {
      title: 'Your weekly review',
      body: gen.body,
      actions,
      meta: {
        playbook: 'weekly',
        proactive: true,
        redirectionId: proposalId,
        starvingGoalIds: starving.map((s) => s.goalId),
        commitmentSweepIds: sweep.map((c) => c.id),
        verdictCard,
      },
    }

    return deliverRhythm(userId, 'weekly', message, gen, {
      runId: opts.runId, at,
      extraOutput: { redirectionId: proposalId, starvingGoalIds: starving.map((s) => s.goalId), verdictCard, monthPillar: monthLayer?.pillar ?? null },
    })
  } catch (e) {
    console.error('[weekly] failed:', e)
    return { status: 'failed', reason: e instanceof Error ? e.message : String(e) }
  }
}

function trunc(s: string, n = 22): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

interface SweepItem { id: string; content: string; dueIso: string | null }

/**
 * Overdue commitments that were surfaced ≥2× in dailies (the §3.3 rule: after
 * two daily surfacings an overdue-unanswered commitment moves to the weekly
 * review). We count prior `cm:<id>:done` action surfacings in inbox_messages.
 */
async function overdueSweep(userId: string): Promise<SweepItem[]> {
  const rows = await prisma.$queryRawUnsafe<{ id: string; content: string; due_date: Date | null }[]>(
    `SELECT id, content, due_date FROM commitments
       WHERE user_id = $1 AND status = 'open' AND due_date IS NOT NULL AND due_date < now()::date
       ORDER BY due_date ASC LIMIT 20`,
    userId,
  ).catch(() => [] as Array<{ id: string; content: string; due_date: Date | null }>)
  const out: SweepItem[] = []
  for (const r of rows) {
    const seen = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*)::bigint AS n FROM inbox_messages WHERE user_id = $1 AND actions_json::text LIKE $2`,
      userId, `%cm:${r.id}:done%`,
    ).catch(() => [] as Array<{ n: bigint }>)
    if (Number(seen[0]?.n ?? 0) >= 2) {
      const dueIso = r.due_date ? (r.due_date instanceof Date ? r.due_date : new Date(r.due_date)).toISOString().slice(0, 10) : null
      out.push({ id: r.id, content: r.content, dueIso })
    }
  }
  return out
}
