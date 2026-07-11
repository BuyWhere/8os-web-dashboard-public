/**
 * src/lib/playbooks/annual.ts — the Annual (Lì Chūn) playbook (E-3, §3.4 / §6).
 *
 * Fires on Lì Chūn (立春) ± the user's chosen offset (LNY window), keyed
 * `{userId}:annual:{baziYear}` by the heartbeat tick. Content contract:
 * year-pillar reading for the chart → last year's alignment STORY (data, not
 * vibes) → year-ahead goal-setting ritual → Life Report preview (first 2 pages)
 * → $59 upsell. Primary action: start the year-ahead ritual.
 *
 * The Lì Chūn playbook is the Life Report's NATIVE sales moment (§6): the run
 * auto-generates the report's first two pages from the user's REAL chart + REAL
 * last-year ledger, then offers the $59 full report (reusing the existing
 * Life Report + Stripe one-time infra). This is a ritual outcome, not a
 * marketing SKU.
 *
 * It ALSO wires the E-10 seasonal reset: Lì Chūn is the sanctioned goal-turnover
 * moment, so the hygiene sweep surfaces here for the year-ahead cleanup.
 */
import { assembleAgentContext } from '@/lib/agent-context'
import { computeAlignment } from '@/lib/alignment-engine'
import { getUserBilling } from '@/lib/subscription'
import { EXPECTED_AMOUNTS } from '@/lib/stripe'
import type { ChannelAction, ChannelMessage } from '@/lib/channels/types'
import {
  decodeUserPhases, layer, callGenerateCoaching, deliverRhythm,
  getBehaviorTokensSafe, onLiChunBoundary, type RhythmRunResult, type DecodedPhases,
} from './rhythm-shared'
import { detectStarvingGoals } from '@/lib/goal-hygiene'

const LIFE_REPORT_PRICE_USD = EXPECTED_AMOUNTS.life_report / 100 // 59

export interface LifeReportPreview {
  generatedFrom: 'real_chart_and_ledger'
  pages: Array<{ page: number; title: string; body: string }>
  fullReportPriceUsd: number
  fullReportPlan: 'life_report'
}

/**
 * Generate the Life Report's first TWO pages from the user's REAL chart
 * (decoded phase engine) + REAL last-year ledger (computeAlignment). No
 * hardcoding — every line references this user's pillars / share numbers.
 */
export function buildLifeReportPreview(
  decoded: DecodedPhases | null,
  lastYear: { headline: string; topGoals: Array<{ name: string; sharePct: number; momentum: string }>; trackedMinutes: number } | null,
): LifeReportPreview {
  const yearLayer = decoded ? layer(decoded.phases, 'year') : null
  const decadeLayer = decoded ? layer(decoded.phases, 'decade') : null
  const fav = decoded?.favorableElements ?? []

  const page1Body = [
    decadeLayer?.pillar ? `Your current decade pillar is ${decadeLayer.pillar}. ${decadeLayer.guidance}` : 'Your luck-pillar decade sets the long tone for this chapter.',
    yearLayer?.pillar ? `The year ahead reads through ${yearLayer.pillar} (流年). ${yearLayer.guidance}` : 'The incoming year pillar frames the season ahead.',
    fav.length ? `Your favorable elements are ${fav.join(', ')} — the currents that carry you when you lean into them.` : '',
  ].filter(Boolean).join('\n\n')

  const page2Body = [
    lastYear?.headline ? `Last year, the data said: ${lastYear.headline}` : 'Last year is your baseline for the year ahead.',
    lastYear?.topGoals?.length
      ? `Where your attention actually went: ${lastYear.topGoals.slice(0, 3).map((g) => `${g.name} (${g.sharePct}%, ${g.momentum})`).join('; ')} — across ${lastYear.trackedMinutes} tracked minutes.`
      : 'You have room to point next year\'s attention deliberately.',
    'The full Life Report reads all four pillars, your ten-year map, and your year-by-year fortune with the same honest, receipts-first method.',
  ].filter(Boolean).join('\n\n')

  return {
    generatedFrom: 'real_chart_and_ledger',
    pages: [
      { page: 1, title: 'Your chart & the decade you\'re in', body: page1Body },
      { page: 2, title: 'Last year, in data — and the year ahead', body: page2Body },
    ],
    fullReportPriceUsd: LIFE_REPORT_PRICE_USD,
    fullReportPlan: 'life_report',
  }
}

export async function runAnnual(
  userId: string,
  opts: { runId?: string; at?: Date } = {},
): Promise<RhythmRunResult> {
  const at = opts.at ?? new Date()
  try {
    const context = await assembleAgentContext(userId, 'annual')
    const decoded = await decodeUserPhases(userId, at)
    const alignment = await computeAlignment(userId, { days: 60 }).catch(() => null)
    const billing = await getUserBilling(userId).catch(() => ({ lifeReportPurchased: false } as { lifeReportPurchased: boolean }))
    const starving = await detectStarvingGoals(userId, { at }).catch(() => [])
    const tokens = await getBehaviorTokensSafe(userId)

    const tz = decoded?.timezone ?? 'UTC'
    const boundary = onLiChunBoundary(tz, at)

    // ── Year-pillar reading ───────────────────────────────────────────────────
    const yearLayer = decoded ? layer(decoded.phases, 'year') : null
    const yearLine = yearLayer
      ? `${yearLayer.pillar} (流年, ${boundary.baziYear} BaZi year): ${yearLayer.guidance}`
      : `The new year begins at Lì Chūn (${boundary.liChunISO}).`

    // ── Last year's alignment story (data, not vibes) ─────────────────────────
    const perGoal = alignment ? [...alignment.weekly.perGoal].sort((a, b) => a.rank - b.rank) : []
    const trackedMinutes = perGoal.reduce((s, g) => s + g.minutes, 0)
    const lastYear = {
      headline: alignment?.weekly.headline || context.state.alignmentHeadline || 'No tracked attention yet — this year is your baseline.',
      topGoals: perGoal.slice(0, 3).map((g) => ({ name: g.name, sharePct: Math.round(g.share * 100), momentum: g.momentum })),
      trackedMinutes,
    }
    const storyLine = perGoal.length
      ? `Last year in data: ${lastYear.topGoals.map((g) => `${g.name} got ${g.sharePct}% (${g.momentum})`).join(', ')} across ${trackedMinutes} tracked minutes.`
      : lastYear.headline

    // ── Seasonal reset (E-10): the sanctioned goal-turnover moment ────────────
    const resetLine = starving.length
      ? `Year-turn cleanup: ${starving.map((s) => `“${s.name}”`).join(', ')} went hungry all year — Lì Chūn is the moment to recommit, shrink, or retire them.`
      : 'Your top priorities held their attention — carry the ones that still matter into the new year.'

    // ── Life Report preview (first 2 pages, REAL chart + ledger) ──────────────
    const preview = buildLifeReportPreview(decoded, lastYear)
    const previewLine = [
      'A preview of your Life Report, page 1–2:',
      `📄 ${preview.pages[0].title}`,
      preview.pages[0].body,
      `📄 ${preview.pages[1].title}`,
      preview.pages[1].body,
    ].join('\n\n')
    const upsellLine = billing.lifeReportPurchased
      ? 'Your full Life Report is unlocked — read it as your year-ahead compass.'
      : `Unlock the full Life Report for $${LIFE_REPORT_PRICE_USD} to read all four pillars and your year-by-year map.`

    const fallbackBody = [
      `Lì Chūn — a new year begins.`,
      '',
      `Your year ahead: ${yearLine}`,
      '',
      storyLine,
      '',
      resetLine,
      '',
      previewLine,
      '',
      upsellLine,
      '',
      'Start the year-ahead ritual to set your goals for the new year.',
    ].filter(Boolean).join('\n')

    const instruction = [
      'Write this user\'s ANNUAL (Lì Chūn) reading. Structure, in order:',
      `1) Their YEAR-PILLAR reading (high confidence, name the pillar): ${yearLine}`,
      `2) Last year's alignment STORY — data, not vibes: ${storyLine}`,
      `3) The year-ahead goal-setting invitation + seasonal reset: ${resetLine}`,
      `4) Then present the Life Report preview (pages 1–2) verbatim and the $${LIFE_REPORT_PRICE_USD} upsell: ${upsellLine}`,
      'End with a single directional nudge to START the year-ahead ritual. ONE primary action only.',
      tokens?.tone ? `Tone: ${tokens.tone}.` : '',
    ].filter(Boolean).join('\n')

    let gen = await callGenerateCoaching({ context, instruction, fallbackBody })
    // Guarantee the preview + upsell are present even if the LLM trimmed them.
    if (!/Life Report/i.test(gen.body)) {
      gen = { body: `${gen.body}\n\n${previewLine}\n\n${upsellLine}`, usedLlm: gen.usedLlm, tokenCost: gen.tokenCost }
    }

    // ── Primary action: start the year-ahead ritual ───────────────────────────
    const actions: ChannelAction[] = [
      { id: 'link:/dashboard/vision?ritual=year-ahead', label: 'Start the year-ahead ritual' },
    ]
    if (!billing.lifeReportPurchased) {
      actions.push({ id: 'checkout:life_report', label: `Unlock Life Report ($${LIFE_REPORT_PRICE_USD})` })
    }
    for (const s of starving) {
      actions.push({ id: `gh:${s.goalId}:retire`, label: `Retire: ${s.name.slice(0, 20)}` })
    }

    const message: ChannelMessage = {
      title: 'Lì Chūn — your year ahead',
      body: gen.body,
      actions,
      meta: {
        playbook: 'annual',
        proactive: true,
        baziYear: boundary.baziYear,
        yearPillar: yearLayer?.pillar ?? null,
        lifeReportPreview: preview,
        lifeReportOffered: !billing.lifeReportPurchased,
        starvingGoalIds: starving.map((s) => s.goalId),
      },
    }

    return deliverRhythm(userId, 'annual', message, gen, {
      runId: opts.runId, at,
      extraOutput: {
        baziYear: boundary.baziYear,
        yearPillar: yearLayer?.pillar ?? null,
        lifeReportOffered: !billing.lifeReportPurchased,
        lifeReportPricePreviewPages: preview.pages.length,
      },
    })
  } catch (e) {
    console.error('[annual] failed:', e)
    return { status: 'failed', reason: e instanceof Error ? e.message : String(e) }
  }
}
