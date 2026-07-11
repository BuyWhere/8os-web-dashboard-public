/**
 * src/lib/goal-hygiene.ts — E-10 goal hygiene & seasonal resets (backlog §5).
 *
 * SCHEMA-FREE: every signal here is computed from the EXISTING ledger
 * (attention_ledger) + goal_rankings + goals.status. No new columns/tables.
 *
 *  - detectStarvingGoals(userId): a goal with PRIORITY RANK ≤ 2 (goal_rankings)
 *    that received < 5% attention share for 21 CONSECUTIVE days → flagged.
 *    Share per day = that goal's (minutes+actions+mentions) / the day's total,
 *    read straight from attention_ledger (the same ledger computeAlignment
 *    aggregates). A day with zero total attention counts as 0% for the goal
 *    (still starving) — an empty ledger cannot rescue a top-priority goal.
 *
 *  - The three operable outcomes (rendered by the weekly playbook + the
 *    <GoalHygieneCard/>): recommit / shrink / retire — implemented by the
 *    /api/goals/hygiene route which calls the helpers below.
 *
 *  - Active-goal cap of 3 ("Focus Mode", default-on): countActiveGoals +
 *    isFocusModeOn — enforced in the goal-create route.
 *
 * Retiring is framed as a WIN of focus (§5): a one-line "goal funeral"
 * reflection is written to journal_entries (kind='goal_funeral') AND memory_items
 * (kind='event', sourceKind='reflection') so the agent remembers the choice.
 */
import { prisma } from '@/lib/db/prisma'
import { DEFAULT_TIMEZONE, isValidTimezone, userLocalDate } from '@/lib/user-time'

export const STARVATION_SHARE_THRESHOLD = 0.05 // < 5% attention share
export const STARVATION_WINDOW_DAYS = 21 // consecutive days
export const STARVATION_PRIORITY_RANK = 2 // rank ≤ 2 (top priorities)
export const ACTIVE_GOAL_CAP = 3 // "Focus Mode" default

export interface StarvingGoal {
  goalId: string
  name: string
  domainId: string
  rank: number
  /** The goal's average attention share over the window (0..1). */
  avgShare: number
  /** Days in the window the goal was below threshold (== window length when flagged). */
  starvedDays: number
  windowDays: number
}

interface LedgerRow { goal_id: string | null; day: Date; minutes: number; actions: number; mentions: number }

/**
 * Detect top-priority (rank ≤ 2) goals that have been starved (< 5% share)
 * every day for the last `windowDays`. Pure ledger read — schema-free.
 */
export async function detectStarvingGoals(
  userId: string,
  opts: { at?: Date; windowDays?: number } = {},
): Promise<StarvingGoal[]> {
  const at = opts.at ?? new Date()
  const windowDays = opts.windowDays ?? STARVATION_WINDOW_DAYS

  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { timezone: true } }).catch(() => null)
  const tz = isValidTimezone(profile?.timezone) ? (profile!.timezone as string) : DEFAULT_TIMEZONE
  const todayIso = userLocalDate(tz, at).iso
  const today = new Date(todayIso + 'T00:00:00Z')
  const since = new Date(today.getTime() - (windowDays - 1) * 86400000)
  const sinceIso = since.toISOString().slice(0, 10)

  // Top-priority active goals (rank ≤ 2).
  const rankings = await prisma.goalRanking.findMany({
    where: { userId, rank: { lte: STARVATION_PRIORITY_RANK } },
    select: { goalId: true, rank: true },
  }).catch(() => [] as Array<{ goalId: string; rank: number }>)
  if (rankings.length === 0) return []

  const goals = await prisma.goal.findMany({
    where: { id: { in: rankings.map((r) => r.goalId) }, userId, status: 'active' },
    select: { id: true, name: true, domainId: true },
  }).catch(() => [] as Array<{ id: string; name: string; domainId: string }>)
  const goalById = new Map(goals.map((g) => [g.id, g]))
  const rankByGoal = new Map(rankings.map((r) => [r.goalId, r.rank]))

  // Ledger for the window (all goals, so we can compute per-day totals).
  const ledger = await prisma.$queryRawUnsafe<LedgerRow[]>(
    `SELECT goal_id, day, minutes, actions, mentions FROM attention_ledger
       WHERE user_id = $1 AND day >= $2::date AND day <= $3::date`,
    userId, sinceIso, todayIso,
  ).catch(() => [] as LedgerRow[])

  // Blend weights match the alignment engine (minutes 50% / actions 30% / mentions 20%).
  const weight = (r: { minutes: number; actions: number; mentions: number }) =>
    r.minutes * 0.5 + r.actions * 0.3 + r.mentions * 0.2

  // Per-day total weight, and per-(goal,day) weight.
  const dayTotal = new Map<string, number>()
  const goalDay = new Map<string, number>() // key `${goalId}|${dayIso}`
  for (const row of ledger) {
    const dayIso = (row.day instanceof Date ? row.day : new Date(row.day)).toISOString().slice(0, 10)
    const w = weight(row)
    dayTotal.set(dayIso, (dayTotal.get(dayIso) ?? 0) + w)
    if (row.goal_id) goalDay.set(`${row.goal_id}|${dayIso}`, (goalDay.get(`${row.goal_id}|${dayIso}`) ?? 0) + w)
  }

  // Enumerate the window's days.
  const days: string[] = []
  for (let i = 0; i < windowDays; i++) {
    days.push(new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10))
  }

  const out: StarvingGoal[] = []
  for (const g of goals) {
    let starvedDays = 0
    let shareSum = 0
    for (const dayIso of days) {
      const total = dayTotal.get(dayIso) ?? 0
      const gw = goalDay.get(`${g.id}|${dayIso}`) ?? 0
      const share = total > 0 ? gw / total : 0
      shareSum += share
      if (share < STARVATION_SHARE_THRESHOLD) starvedDays++
    }
    // Flagged only when EVERY day in the window was below threshold.
    if (starvedDays === windowDays) {
      out.push({
        goalId: g.id,
        name: g.name,
        domainId: g.domainId,
        rank: rankByGoal.get(g.id) ?? STARVATION_PRIORITY_RANK,
        avgShare: shareSum / windowDays,
        starvedDays,
        windowDays,
      })
    }
  }
  out.sort((a, b) => a.rank - b.rank)
  return out
}

// ─── Active-goal cap ("Focus Mode") — schema-free ───────────────────────────

/** Count the user's ACTIVE goals. */
export async function countActiveGoals(userId: string): Promise<number> {
  return prisma.goal.count({ where: { userId, status: 'active' } }).catch(() => 0)
}

/**
 * Focus Mode (active-goal cap) is default-ON, overridable per user via the
 * notification_prefs.prefs_json.focus_mode.enabled flag (schema-free — reuses
 * the existing JSON blob). Returns true when the cap should be enforced.
 */
export async function isFocusModeOn(userId: string): Promise<boolean> {
  const row = await prisma.notificationPrefs.findUnique({
    where: { userId }, select: { prefsJson: true },
  }).catch(() => null)
  const j = (row?.prefsJson as Record<string, { enabled?: boolean }> | null) ?? null
  // default-on: only an explicit `false` disables it.
  return j?.focus_mode?.enabled !== false
}

/**
 * Would creating one more active goal exceed the cap under Focus Mode?
 * Returns { blocked, activeCount, cap } — the goal-create route turns `blocked`
 * into a 409 with the override path.
 */
export async function wouldExceedActiveCap(userId: string): Promise<{ blocked: boolean; activeCount: number; cap: number; focusMode: boolean }> {
  const [activeCount, focusMode] = await Promise.all([countActiveGoals(userId), isFocusModeOn(userId)])
  const blocked = focusMode && activeCount >= ACTIVE_GOAL_CAP
  return { blocked, activeCount, cap: ACTIVE_GOAL_CAP, focusMode }
}

// ─── The three operable outcomes ────────────────────────────────────────────

export type HygieneAction = 'recommit' | 'shrink' | 'retire'

export interface HygieneOutcome {
  action: HygieneAction
  goalId: string
  /** recommit → a redirection proposal was created/reused. */
  proposalId?: string | null
  /** shrink → the drafted smaller-goal text (not persisted; user confirms). */
  shrinkDraft?: string
  /** retire → the goal-funeral reflection line saved to journal + memory. */
  funeralLine?: string
  /** retire → the created journal + memory row ids. */
  journalEntryId?: string | null
  memoryItemId?: string | null
}

/**
 * RECOMMIT: auto-propose a recurring focus block for the goal via E-7's
 * ensureProposal (which finds a conflict-free slot via findBestSlot). We pass
 * the goalId explicitly + a recommit rationale, so the proposal targets THIS
 * goal (not the generic starving-#1).
 */
export async function recommitGoal(userId: string, goalId: string): Promise<HygieneOutcome> {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId, status: 'active' }, select: { id: true, name: true } })
  if (!goal) return { action: 'recommit', goalId, proposalId: null }
  let proposalId: string | null = null
  try {
    const { ensureProposal } = await import('@/lib/redirections')
    const res = await ensureProposal(userId, {
      sourceKind: 'alignment',
      goalId: goal.id,
      rationale: `You recommitted to “${goal.name}”. Here's a protected block to start feeding it again — accept to lock it in.`,
    })
    proposalId = res?.proposal.id ?? null
  } catch (e) {
    console.error('[goal-hygiene] recommit ensureProposal failed:', e)
  }
  await prisma.activityLog.create({
    data: { userId, goalId: goal.id, action: 'goal_recommitted', metadata: { proposalId } },
  }).catch(() => {})
  return { action: 'recommit', goalId, proposalId }
}

/**
 * SHRINK: the agent drafts a SMALLER version of the goal. We generate a
 * concrete, less-ambitious restatement (deterministic fallback + optional LLM
 * polish via generateCoaching) and return it for the user to confirm — we do
 * NOT silently mutate the goal (the user owns the edit).
 */
export async function shrinkGoal(userId: string, goalId: string): Promise<HygieneOutcome> {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId, status: 'active' },
    select: { id: true, name: true, definition: true, domainId: true },
  })
  if (!goal) return { action: 'shrink', goalId, shrinkDraft: '' }

  const fallback = `Smaller version of “${goal.name}”: pick the single next concrete milestone you can finish in two weeks, and make THAT the goal for now. You can grow it back once it's moving.`
  let draft = fallback
  try {
    const { assembleAgentContext } = await import('@/lib/agent-context')
    const { callGenerateCoaching } = await import('@/lib/playbooks/rhythm-shared')
    const context = await assembleAgentContext(userId, 'weekly')
    const gen = await callGenerateCoaching({
      context,
      instruction: [
        `The user's top-priority goal “${goal.name}” (${goal.domainId}) has been starving for 3 weeks.`,
        `Its current definition: "${goal.definition}".`,
        'Draft a SMALLER, more achievable version — one concrete milestone they can finish in ~2 weeks.',
        'Output ONLY the shrunk goal as a single sentence the user can accept as their new goal. No preamble, no coaching, no options.',
      ].join('\n'),
      fallbackBody: fallback,
    })
    draft = (gen.body || fallback).trim()
  } catch (e) {
    console.error('[goal-hygiene] shrink draft failed — fallback:', e)
  }
  await prisma.activityLog.create({
    data: { userId, goalId: goal.id, action: 'goal_shrink_drafted', metadata: { draft } },
  }).catch(() => {})
  return { action: 'shrink', goalId, shrinkDraft: draft }
}

/**
 * RETIRE: archive the goal (goals.status='archived') and write a one-line
 * "goal funeral" reflection to journal + memory — framed as a WIN of focus.
 * SCHEMA-FREE: uses the existing GoalStatus enum + journal_entries + memory_items.
 */
export async function retireGoal(userId: string, goalId: string, note?: string): Promise<HygieneOutcome> {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId }, select: { id: true, name: true } })
  if (!goal) return { action: 'retire', goalId }

  await prisma.goal.update({ where: { id: goal.id }, data: { status: 'archived' } }).catch((e) => {
    console.error('[goal-hygiene] retire archive failed:', e)
  })

  const funeralLine = note?.trim()
    ? `Retired “${goal.name}” to protect my focus — ${note.trim()}`
    : `Retired “${goal.name}” — choosing focus over a crowded list is a win, not a failure. One fewer thing, more room for what matters now.`

  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { timezone: true } }).catch(() => null)
  const tz = isValidTimezone(profile?.timezone) ? (profile!.timezone as string) : DEFAULT_TIMEZONE
  const entryDate = new Date(userLocalDate(tz, new Date()).iso + 'T00:00:00Z')

  let journalEntryId: string | null = null
  let memoryItemId: string | null = null
  try {
    const j = await prisma.journalEntry.create({
      data: { userId, content: funeralLine, kind: 'goal_funeral', entryDate },
      select: { id: true },
    })
    journalEntryId = j.id
  } catch (e) {
    console.error('[goal-hygiene] funeral journal write failed:', e)
  }
  try {
    const m = await prisma.memoryItem.create({
      data: {
        userId, kind: 'event', content: funeralLine, salience: 4,
        sourceKind: 'reflection', sourceId: journalEntryId,
      },
      select: { id: true },
    })
    memoryItemId = m.id
  } catch (e) {
    console.error('[goal-hygiene] funeral memory write failed:', e)
  }
  await prisma.activityLog.create({
    data: { userId, goalId: goal.id, action: 'goal_retired', metadata: { funeralLine } },
  }).catch(() => {})

  return { action: 'retire', goalId, funeralLine, journalEntryId, memoryItemId }
}

/** Dispatch a hygiene action from the API route. */
export async function applyHygieneAction(
  userId: string, goalId: string, action: HygieneAction, note?: string,
): Promise<HygieneOutcome> {
  switch (action) {
    case 'recommit': return recommitGoal(userId, goalId)
    case 'shrink': return shrinkGoal(userId, goalId)
    case 'retire': return retireGoal(userId, goalId, note)
  }
}
