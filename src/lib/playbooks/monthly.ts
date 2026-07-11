/**
 * src/lib/playbooks/monthly.ts — the Monthly (流月 transition) playbook (E-3, §3.4).
 *
 * Fires on the SOLAR-TERM month boundary (the 流月 turnover), keyed
 * `{userId}:monthly:{yyyymm}` by the heartbeat tick. Content contract:
 * what the incoming month favors for THIS chart → goal-pacing adjustment →
 * hygiene check (E-10). Primary action: accept re-pacing.
 *
 * Re-pacing is operable via a redirection proposal (E-7 ensureProposal, which
 * finds a real conflict-free slot with findBestSlot) pointed at the goal whose
 * domain the incoming month most favors — "batch reschedule via findBestSlot"
 * without editing the scheduler or task routes (owned by the concurrent build).
 *
 * Every claim cites the user's REAL 流月 pillar + REAL ledger. Delivered via the
 * governor.
 */
import { assembleAgentContext } from '@/lib/agent-context'
import { computeAlignment } from '@/lib/alignment-engine'
import { ensureProposal } from '@/lib/redirections'
import type { ChannelAction, ChannelMessage } from '@/lib/channels/types'
import {
  decodeUserPhases, layer, callGenerateCoaching, deliverRhythm,
  getBehaviorTokensSafe, type RhythmRunResult,
} from './rhythm-shared'
import { detectStarvingGoals } from '@/lib/goal-hygiene'
import { prisma } from '@/lib/db/prisma'

export async function runMonthly(
  userId: string,
  opts: { runId?: string; at?: Date } = {},
): Promise<RhythmRunResult> {
  const at = opts.at ?? new Date()
  try {
    const context = await assembleAgentContext(userId, 'monthly')
    const decoded = await decodeUserPhases(userId, at)
    const alignment = await computeAlignment(userId, { days: 30 }).catch(() => null)
    const starving = await detectStarvingGoals(userId, { at }).catch(() => [])
    const tokens = await getBehaviorTokensSafe(userId)

    // ── What the INCOMING 流月 favors for this chart ──────────────────────────
    const monthLayer = decoded ? layer(decoded.phases, 'month') : null
    // The current month (index 0 of the quarter projection) is the incoming
    // solar month at the boundary tick.
    const incoming = decoded?.quarter.months[0] ?? null
    const favorLine = monthLayer
      ? `${monthLayer.pillar} (流月): ${monthLayer.guidance}`
      : 'A steady month — hold your pace on fundamentals.'
    const favorableDomains = incoming?.favorableDomains ?? []

    // ── Goal-pacing adjustment: front-load favored domains, hold the rest ─────
    const perGoal = alignment ? [...alignment.weekly.perGoal].sort((a, b) => a.rank - b.rank) : []
    const goalsWithDomain = await goalDomains(userId, perGoal.map((g) => g.goalId))
    const favDomainSet = new Set<string>(favorableDomains as unknown as string[])
    const frontLoad = perGoal.filter((g) => favDomainSet.has(goalsWithDomain.get(g.goalId) ?? ''))
    const hold = perGoal.filter((g) => !favDomainSet.has(goalsWithDomain.get(g.goalId) ?? ''))
    const pacingLine = frontLoad.length
      ? `Front-load ${frontLoad.slice(0, 2).map((g) => `“${g.name}”`).join(' and ')} this month — ${incoming?.mode === 'push' ? 'the month pushes their domain' : 'their domain reads best now'}. ${hold.length ? `Hold the big push on ${hold.slice(0, 2).map((g) => `“${g.name}”`).join(' and ')} for a friendlier month.` : ''}`
      : `${incoming?.mode === 'consolidate' ? 'A consolidate month — tighten systems and prep rather than launch.' : 'Keep momentum on your top priority; no domain is strongly favored this month.'}`

    // ── Hygiene check (E-10) ──────────────────────────────────────────────────
    const hygieneLine = starving.length
      ? `Hygiene check: ${starving.map((s) => `“${s.name}” has held under ${Math.round(s.avgShare * 100)}% for ${s.windowDays} days`).join('; ')}. Your weekly review will let you recommit, shrink, or retire.`
      : ''

    const fallbackBody = [
      `The incoming month for your chart: ${favorLine}`,
      '',
      pacingLine,
      ...(hygieneLine ? ['', hygieneLine] : []),
      '',
      'Accept the re-pacing to book your first favored-domain block this month.',
    ].filter(Boolean).join('\n')

    const instruction = [
      'Write this user\'s MONTHLY (流月 transition) note. Structure, in order:',
      `1) What the INCOMING solar month favors for THIS chart (medium confidence, name the pillar): ${favorLine}`,
      `2) A concrete goal-pacing adjustment using their real goals: ${pacingLine}`,
      hygieneLine ? `3) A brief hygiene check (no shame): ${hygieneLine}` : '',
      'End with a single directional nudge toward accepting the re-pacing (booking the first favored-domain block). ONE primary action only.',
      tokens?.tone ? `Tone: ${tokens.tone}.` : '',
    ].filter(Boolean).join('\n')

    const gen = await callGenerateCoaching({ context, instruction, fallbackBody })

    // ── Primary action: accept re-pacing → a real slot for the favored goal ───
    // ensureProposal calls findBestSlot internally to place a conflict-free
    // block; we point it at the highest-priority front-load goal (or starving-#1).
    let proposalId: string | null = null
    const target = frontLoad[0]?.goalId ?? starving[0]?.goalId
    try {
      const res = await ensureProposal(userId, {
        sourceKind: 'alignment',
        alignment: alignment ?? undefined,
        ...(target ? { goalId: target, rationale: pacingLine } : {}),
        sourceRunId: opts.runId,
      })
      proposalId = res?.proposal.id ?? null
    } catch (e) {
      console.error('[monthly] ensureProposal failed:', e)
    }

    const actions: ChannelAction[] = proposalId
      ? [{ id: `rp:${proposalId}:accept`, label: 'Accept re-pacing' }]
      : [{ id: 'link:/dashboard/quarter', label: 'Re-pace this month' }]

    const message: ChannelMessage = {
      title: 'A new solar month',
      body: gen.body,
      actions,
      meta: {
        playbook: 'monthly',
        proactive: true,
        redirectionId: proposalId,
        monthPillar: monthLayer?.pillar ?? null,
        termName: incoming?.termName ?? null,
        favorableDomains,
      },
    }

    return deliverRhythm(userId, 'monthly', message, gen, {
      runId: opts.runId, at,
      extraOutput: {
        redirectionId: proposalId,
        monthPillar: monthLayer?.pillar ?? null,
        termName: incoming?.termName ?? null,
        favorableDomains,
      },
    })
  } catch (e) {
    console.error('[monthly] failed:', e)
    return { status: 'failed', reason: e instanceof Error ? e.message : String(e) }
  }
}

async function goalDomains(userId: string, goalIds: string[]): Promise<Map<string, string>> {
  if (goalIds.length === 0) return new Map()
  const goals = await prisma.goal.findMany({
    where: { id: { in: goalIds }, userId }, select: { id: true, domainId: true },
  }).catch(() => [] as Array<{ id: string; domainId: string }>)
  return new Map(goals.map((g) => [g.id, g.domainId]))
}
