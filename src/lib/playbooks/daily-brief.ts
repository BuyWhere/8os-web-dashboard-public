/**
 * src/lib/playbooks/daily-brief.ts — the morning brief playbook (E-3, §3.4).
 *
 * Contract (spec table): today's pillar (one line, honest confidence) → Big-3
 * (favorable-domain-biased) → one alignment note. Primary action: "Plan my
 * Big 3" → /dashboard/today, UNLESS an open E-7 redirection proposal exists, in
 * which case the primary action is that proposal's one-tap accept
 * (id `rp:<proposalId>:accept`).
 *
 * Flow: assemble context → generate message under §3.6 coaching policy →
 * deliver via the governor (E-13). The governor owns quiet-hours/cap/snooze and
 * marks the run skipped if suppressed. Emits PostHog `brief_delivered`.
 *
 * Every number in the brief is a REAL receipt from the user's ledger / Big-3 —
 * nothing is synthesised. If Flow AI is down, a deterministic template ships.
 */
import { assembleAgentContext } from '@/lib/agent-context'
import { prisma } from '@/lib/db/prisma'
import { deliverProactive } from '@/lib/channels/governor'
import type { ChannelAction, ChannelMessage } from '@/lib/channels/types'
import {
  computeBig3, openRedirection, dueCommitments, generateCoaching, captureBriefEvent,
} from './shared'

export interface PlaybookRunResult {
  status: 'done' | 'skipped' | 'failed'
  reason?: string
  inboxMessageId?: string | null
  usedLlm?: boolean
  /** The delivered message body — surfaced for QA/probe assertions. */
  body?: string
  tokenCost?: unknown
}

export async function runDailyBrief(
  userId: string,
  opts: { runId?: string; at?: Date } = {},
): Promise<PlaybookRunResult> {
  try {
    const context = await assembleAgentContext(userId, 'daily_brief')
    const big3 = await computeBig3(userId)
    const redirection = await openRedirection(userId)
    const commitments = await dueCommitments(userId, opts.at ?? new Date())

    // Sunsama-style realism line: how much is actually planned for today (open
    // tasks scheduled within the user's local day). Best-effort; never throws.
    let planLine = ''
    try {
      const { userDayBounds } = await import('@/lib/user-time')
      const bounds = userDayBounds(context.timezone, opts.at ?? new Date())
      const todays = await prisma.oSTask.findMany({
        where: { userId, status: { in: ['todo', 'in_progress'] }, scheduledAt: { gte: bounds.start, lt: bounds.end } },
        select: { duration: true },
      })
      if (todays.length > 0) {
        const h = Math.round((todays.reduce((s, t) => s + (t.duration || 0), 0) / 60) * 10) / 10
        planLine = `Planned today: ${todays.length} task${todays.length === 1 ? '' : 's'}, about ${h}h${h > 8 ? ' (that is a heavy day, consider trimming)' : ''}.`
      }
    } catch { /* omit the line */ }

    // ── Deterministic receipts (the honest fallback + the LLM's source data) ──
    const pillarLine = big3.dayPillar
      ? `Today's pillar ${big3.dayPillar}, ${big3.dayTintLine ?? 'work your plan.'} (soft daily tint, orientation not prediction)`
      : (big3.dayTintLine ?? 'A steady day, work your plan.')

    const big3Lines = big3.big3.length
      ? big3.big3.map((t, i) => `${i + 1}. ${t.name}${t.goalName ? `, ${t.goalName}` : ''}`).join('\n')
      : 'No open tasks queued, add one to seed today.'

    // One alignment note = the top-priority goal's real share, or the redirection.
    const topGoal = context.state.topGoals[0]
    let alignmentNote: string
    if (redirection) {
      alignmentNote = redirection.rationale || 'A redirection is waiting to reclaim time for a starving priority.'
    } else if (topGoal) {
      alignmentNote = `${topGoal.name} is at ${topGoal.sharePct}% of your ${context.state.trackedMinutes} tracked minutes this week (${topGoal.momentum}).`
    } else {
      alignmentNote = context.state.alignmentHeadline ?? 'No tracked attention yet this week, today\'s Big 3 is the place to start.'
    }

    // ── Due commitments (E-6 §3.3 follow-up) — neutral facts, never guilt ─────
    const commitmentLine = commitments.length
      ? [
          '',
          commitments.length === 1
            ? 'You said you\'d take care of this:'
            : `You said you'd take care of ${commitments.length} things:`,
          ...commitments.map((c) => `- ${c.content}${c.dueDate ? ` (${c.overdue ? 'was due' : 'due'} ${c.dueDate})` : ''}`),
        ].join('\n')
      : ''

    const fallbackBody = [
      pillarLine,
      '',
      'Your Big 3 today:',
      big3Lines,
      ...(planLine ? ['', planLine] : []),
      '',
      alignmentNote,
      ...(commitmentLine ? [commitmentLine] : []),
    ].join('\n')

    // ── §3.6 coaching generation (falls back to the template above) ───────────
    const instruction = [
      'Write this user\'s DAILY MORNING BRIEF. Structure, in this order:',
      `1) One line for today's pillar (honest, soft confidence): ${pillarLine}`,
      `2) Their Big 3 for today (list exactly these, unchanged):\n${big3Lines}`,
      `3) Exactly ONE alignment note using a real receipt: ${alignmentNote}`,
      ...(planLine ? [`3b) Include this planned-load line verbatim (realism check): ${planLine}`] : []),
      commitments.length
        ? `4) Then, plainly and WITHOUT guilt, remind them of what they committed to (state the fact, offer no judgment): ${commitments.map((c) => `"${c.content}"${c.dueDate ? ` (due ${c.dueDate})` : ''}`).join('; ')}. Say the buttons below let them mark it done, pick a new date, or drop it.`
        : '',
      'End with a single directional nudge toward the one primary action. Do NOT list multiple actions in the text.',
    ].filter(Boolean).join('\n')

    const gen = await generateCoaching({ context, instruction, fallbackBody })

    // ── The ONE primary action (§3.4) + commitment follow-up choices (§3.3) ───
    // The primary action stays single (redirection accept OR Plan my Big 3);
    // each due commitment adds its three operable choices as inbox actions.
    const actions: ChannelAction[] = redirection
      ? [{ id: `rp:${redirection.id}:accept`, label: 'Accept redirection' }]
      : [{ id: 'link:/dashboard/today', label: 'Plan my Big 3' }]

    for (const c of commitments) {
      actions.push({ id: `cm:${c.id}:done`, label: 'Done' })
      actions.push({ id: `cm:${c.id}:renegotiate`, label: 'New date' })
      actions.push({ id: `cm:${c.id}:drop`, label: 'Drop' })
    }

    const message: ChannelMessage = {
      title: 'Your morning brief',
      body: gen.body,
      actions,
      meta: {
        playbook: 'daily_brief',
        pillar: big3.dayPillar,
        big3Ids: big3.big3.map((t) => t.id),
        redirectionId: redirection?.id ?? null,
        commitmentIds: commitments.map((c) => c.id),
      },
    }

    const gov = await deliverProactive(userId, message, {
      kind: 'daily_brief', runId: opts.runId, at: opts.at,
    })

    if (gov.suppressed) {
      return { status: 'skipped', reason: gov.reason, usedLlm: gen.usedLlm, body: gen.body }
    }

    await captureBriefEvent(userId, 'brief_delivered', {
      kind: 'daily_brief',
      inbox_message_id: gov.outcome?.inboxMessageId ?? null,
      has_redirection: !!redirection,
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
    console.error('[daily-brief] failed:', e)
    return { status: 'failed', reason: e instanceof Error ? e.message : String(e) }
  }
}
