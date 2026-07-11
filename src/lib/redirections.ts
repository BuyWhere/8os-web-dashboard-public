/**
 * src/lib/redirections.ts — one-tap redirection proposals (E-7, backlog §5).
 *
 * Turns the Alignment Engine's advisory redirection (the starving
 * highest-priority goal) into an OPERABLE proposal: a concrete, conflict-free
 * 60-minute slot in the next 48h (findBestSlot; external calendars count as
 * busy — doc §4.2), persisted in `redirection_proposals` and accepted /
 * declined via /api/redirections.
 *
 * Generation contract (`ensureProposal`):
 *   - Lazy expiry first: any OPEN proposal older than 48h is marked expired.
 *   - Dedupe: if an OPEN proposal already exists for the same goal, it is
 *     reused (no new row) — two consecutive verdict computations create ONE
 *     proposal.
 *   - Target goal = the alignment verdict's starving-#1 selection (same
 *     rank-then-in-season sort the engine's topRedirection uses), or an
 *     explicit goalId override (the retro path passes its own 30-day
 *     starving-#1 + its redirection sentence as the rationale).
 *   - No conflict-free slot in the window → no proposal (never propose a
 *     slot we know collides).
 *
 * PostHog: `redirection_proposed` is emitted server-side on creation via the
 * same dependency-free /capture/ pattern as src/lib/error-track.ts (the
 * posthog-node path in analytics-server.ts depends on POSTHOG_Project_token,
 * which is not set in prod). Never throws; result is surfaced so QA probes
 * can assert ingest acceptance.
 */
import { prisma } from '@/lib/db/prisma'
import { computeAlignment, type AlignmentResult } from '@/lib/alignment-engine'
import { findBestSlot } from '@/lib/scheduling/engine'
import { getExternalBusyWindows } from '@/lib/external/google-calendar'

const HOUR_MS = 3600_000
export const PROPOSAL_TTL_MS = 48 * HOUR_MS
export const PROPOSAL_DURATION_MINUTES = 60
const SLOT_SEARCH_DAYS = 2 // "next 48h"

// Energy framing was removed product-wide — neutral map, pure availability
// (same convention as /api/schedule and the assistant scheduler).
const NEUTRAL_ENERGY_MAP: Record<number, 'green'> = Object.fromEntries(
  Array.from({ length: 24 }, (_, i) => [i, 'green' as const]),
)

export type DeclineReason = 'busy' | 'wrong_goal' | 'not_now'
export const DECLINE_REASONS: readonly DeclineReason[] = ['busy', 'wrong_goal', 'not_now']

export interface AnalyticsResult {
  sent: boolean
  status?: number
  reason?: string
}

/** The wire shape every surface (panel, retro, inbox) renders. */
export interface ProposalDTO {
  id: string
  goalId: string
  goalName: string
  rationale: string
  proposedSlotStart: string // ISO
  proposedSlotEnd: string // ISO
  status: string
  sourceKind: string
  createdAt: string
}

interface ProposalRow {
  id: string
  goalId: string
  rationale: string
  proposedSlotStart: Date
  proposedSlotEnd: Date
  status: string
  sourceKind: string
  createdAt: Date
}

export function toProposalDTO(row: ProposalRow, goalName: string): ProposalDTO {
  return {
    id: row.id,
    goalId: row.goalId,
    goalName,
    rationale: row.rationale,
    proposedSlotStart: row.proposedSlotStart.toISOString(),
    proposedSlotEnd: row.proposedSlotEnd.toISOString(),
    status: row.status,
    sourceKind: row.sourceKind,
    createdAt: row.createdAt.toISOString(),
  }
}

// ─── Server-side PostHog capture (error-track.ts pattern, never throws) ──────

const CAPTURE_TIMEOUT_MS = 3000

export async function captureRedirectionEvent(
  userId: string,
  event: 'redirection_proposed' | 'redirection_accepted' | 'redirection_declined',
  properties: Record<string, unknown>,
): Promise<AnalyticsResult> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!apiKey) return { sent: false, reason: 'NEXT_PUBLIC_POSTHOG_KEY not set' }
    const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/+$/, '')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS)
    try {
      const res = await fetch(`${host}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          event,
          distinct_id: userId,
          timestamp: new Date().toISOString(),
          properties: { $lib: '8os-server', ...properties },
        }),
        signal: controller.signal,
      })
      return { sent: res.ok, status: res.status }
    } finally {
      clearTimeout(timer)
    }
  } catch (e) {
    console.error('[redirections] posthog capture failed:', e instanceof Error ? e.message : e)
    return { sent: false, reason: e instanceof Error ? e.message : 'capture failed' }
  }
}

// ─── Lazy expiry ──────────────────────────────────────────────────────────────

/** Mark this user's >48h-old OPEN proposals expired. Returns count. */
export async function expireStaleProposals(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - PROPOSAL_TTL_MS)
  const res = await prisma.redirectionProposal.updateMany({
    where: { userId, status: 'open', createdAt: { lt: cutoff } },
    data: { status: 'expired', decidedAt: new Date() },
  })
  return res.count
}

// ─── Slot finding ─────────────────────────────────────────────────────────────

/**
 * Next conflict-free 60-min slot in the coming 48h, counting BOTH native
 * calendar events and non-deleted external events as busy. Null when the
 * window is fully booked — callers must not propose a colliding slot.
 */
export async function findProposalSlot(
  userId: string,
  searchFrom: Date = new Date(),
): Promise<{ startAt: Date; endAt: Date } | null> {
  const searchEnd = new Date(searchFrom.getTime() + (SLOT_SEARCH_DAYS + 1) * 24 * HOUR_MS)
  const [native, external] = await Promise.all([
    prisma.calendarEvent.findMany({
      // overlap query: anything intersecting the window is busy time
      where: { userId, startAt: { lt: searchEnd }, endAt: { gt: searchFrom } },
      select: { startAt: true, endAt: true },
      take: 2000,
    }),
    getExternalBusyWindows(userId, searchFrom, searchEnd),
  ])
  const slot = findBestSlot({
    durationMinutes: PROPOSAL_DURATION_MINUTES,
    energyRequired: 'green',
    energyMap: NEUTRAL_ENERGY_MAP,
    existingEvents: [...native, ...external],
    searchFrom,
    searchDays: SLOT_SEARCH_DAYS,
  })
  if (!slot || !slot.conflictFree) return null
  return { startAt: slot.startAt, endAt: slot.endAt }
}

// ─── Generation ───────────────────────────────────────────────────────────────

export interface EnsureProposalOptions {
  sourceKind: 'alignment' | 'retro' | 'brief'
  /** Reuse an already-computed verdict (the /api/alignment path) — avoids recomputing. */
  alignment?: AlignmentResult
  /** Explicit target goal (the retro path passes its 30-day starving-#1). */
  goalId?: string
  /** Explicit rationale (e.g. the retro's redirection sentence). */
  rationale?: string
  sourceRunId?: string
}

export interface EnsureProposalResult {
  proposal: ProposalDTO
  created: boolean
  /** Ingest result for `redirection_proposed` (only when created). */
  analytics?: AnalyticsResult
}

/**
 * Ensure there is ONE open proposal for the user's starving-#1 goal.
 * Returns null when there is nothing to propose (no starving goal, goal gone,
 * or no conflict-free slot in the next 48h). Never throws on the happy-path
 * callers' behalf — callers wrap it best-effort anyway.
 */
export async function ensureProposal(
  userId: string,
  opts: EnsureProposalOptions,
): Promise<EnsureProposalResult | null> {
  await expireStaleProposals(userId)

  // ── Resolve the target goal + rationale ────────────────────────────────────
  let goalId = opts.goalId ?? null
  let rationale = opts.rationale ?? ''

  if (!goalId) {
    const alignment = opts.alignment ?? (await computeAlignment(userId, { days: 7 }))
    // Same starving-#1 selection the engine's topRedirection uses:
    // rank ascending, in-season as tie-break.
    const starving = alignment.weekly.perGoal
      .filter((g) => g.momentum === 'starving')
      .sort((a, b) => a.rank - b.rank || Number(b.inSeason === true) - Number(a.inSeason === true))
    if (starving.length === 0) return null
    goalId = starving[0].goalId
    // The engine's redirection sentence IS about starving[0] — reuse verbatim
    // when there is tracked signal; otherwise fall back to a concrete line.
    const anySignal = alignment.weekly.perGoal.some((g) => g.minutes + g.actions + g.mentions > 0)
    rationale = anySignal
      ? alignment.weekly.topRedirection
      : `Your #${starving[0].rank} priority “${starving[0].name}” has no tracked attention yet — book one block to start.`
  }

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId, status: 'active' },
    select: { id: true, name: true, domainId: true },
  })
  if (!goal) return null
  if (!rationale) {
    rationale = `Your priority “${goal.name}” is starving — point your next open block at it.`
  }

  // ── Dedupe: reuse the existing OPEN proposal for this goal ─────────────────
  const existing = await prisma.redirectionProposal.findFirst({
    where: { userId, goalId: goal.id, status: 'open' },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) {
    return { proposal: toProposalDTO(existing, goal.name), created: false }
  }

  // ── Concrete slot (conflict-free, next 48h, external-aware) ────────────────
  const slot = await findProposalSlot(userId)
  if (!slot) return null

  const row = await prisma.redirectionProposal.create({
    data: {
      userId,
      goalId: goal.id,
      rationale,
      proposedSlotStart: slot.startAt,
      proposedSlotEnd: slot.endAt,
      status: 'open',
      sourceKind: opts.sourceKind,
      sourceRunId: opts.sourceRunId ?? null,
    },
  })

  const analytics = await captureRedirectionEvent(userId, 'redirection_proposed', {
    proposalId: row.id,
    goalId: goal.id,
    goal: goal.name,
    sourceKind: opts.sourceKind,
    slotStart: slot.startAt.toISOString(),
  })

  return { proposal: toProposalDTO(row, goal.name), created: true, analytics }
}
