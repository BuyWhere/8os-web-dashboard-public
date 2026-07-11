/**
 * POST /api/redirections/:id/accept — book the proposed slot (E-7, §5).
 *
 * One tap turns a redirection proposal into a real, goal-linked CalendarEvent:
 *   1. Load the OPEN proposal (must belong to the caller).
 *      - Already accepted → 409 no-op with the existing event (idempotent).
 *      - expired / declined → 409 (nothing to book).
 *   2. Re-validate the slot is still conflict-free against BOTH native calendar
 *      events and external (read-only) calendar events. If a new conflict has
 *      appeared since the proposal was made, re-slot via findBestSlot over the
 *      next 48h (external-aware) and book that instead; the persisted slot is
 *      updated so the surfaces show what was actually booked.
 *   3. Create the goal-linked CalendarEvent (title = goal name, domainId =
 *      goal's domain, a `goalId:` marker in the description so the attention
 *      ledger attributes it back to the goal), mark the proposal accepted, and
 *      emit `redirection_accepted`.
 *
 * Focus-block defense: the created event is a 60-min protected block; the
 * scheduler already treats existing calendar + external events as busy, so a
 * booked redirection block defends itself against later auto-scheduling.
 *
 * Clerk-authed, rate-limited (redirections preset). Same route shape as the
 * other operable endpoints.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import {
  captureRedirectionEvent,
  findProposalSlot,
  PROPOSAL_DURATION_MINUTES,
} from '@/lib/redirections'
import { getExternalBusyWindows } from '@/lib/external/google-calendar'
import { captureServerException } from '@/lib/error-track'

const REDIRECTION_MARKER = 'redirection proposal'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.redirections, auth.userId)
  if (limited) return limited

  const { id } = await ctx.params

  try {
    const proposal = await prisma.redirectionProposal.findFirst({
      where: { id, userId: auth.userId },
    })
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 })
    }

    // Idempotent second accept: return the already-created block, do not double-book.
    if (proposal.status === 'accepted') {
      const existing = await prisma.calendarEvent.findFirst({
        where: {
          userId: auth.userId,
          startAt: proposal.proposedSlotStart,
          description: { contains: `[${REDIRECTION_MARKER}:${proposal.id}]` },
        },
      })
      return NextResponse.json(
        { error: 'Already accepted.', proposalId: proposal.id, event: existing ?? null, alreadyAccepted: true },
        { status: 409 },
      )
    }
    if (proposal.status !== 'open') {
      return NextResponse.json(
        { error: `Proposal is ${proposal.status}.`, proposalId: proposal.id },
        { status: 409 },
      )
    }

    const goal = await prisma.goal.findFirst({
      where: { id: proposal.goalId, userId: auth.userId },
      select: { id: true, name: true, domainId: true },
    })
    if (!goal) {
      return NextResponse.json({ error: 'Goal no longer exists.' }, { status: 409 })
    }

    // ── Re-validate the slot; re-slot if a new conflict appeared ─────────────
    let startAt = proposal.proposedSlotStart
    let endAt = proposal.proposedSlotEnd
    const [native, external] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: { userId: auth.userId, startAt: { lt: endAt }, endAt: { gt: startAt } },
        select: { startAt: true, endAt: true },
        take: 2000,
      }),
      getExternalBusyWindows(auth.userId, startAt, endAt),
    ])
    const conflicted = [...native, ...external].some((e) => startAt < e.endAt && endAt > e.startAt)
    let reslotted = false
    if (conflicted) {
      const slot = await findProposalSlot(auth.userId)
      if (!slot) {
        return NextResponse.json(
          { error: 'That time is no longer free and there is no open slot in the next 48h.' },
          { status: 409 },
        )
      }
      startAt = slot.startAt
      endAt = slot.endAt
      reslotted = true
    }

    // ── Book the goal-linked, focus-defended block ───────────────────────────
    const event = await prisma.calendarEvent.create({
      data: {
        userId: auth.userId,
        title: goal.name,
        description: `Redirection block for “${goal.name}” — booked from an alignment proposal. [${REDIRECTION_MARKER}:${proposal.id}] [goalId:${goal.id}]`,
        startAt,
        endAt,
        domainId: goal.domainId,
      },
    })

    await prisma.redirectionProposal.update({
      where: { id: proposal.id },
      data: {
        status: 'accepted',
        proposedSlotStart: startAt,
        proposedSlotEnd: endAt,
        decidedAt: new Date(),
      },
    })

    const analytics = await captureRedirectionEvent(auth.userId, 'redirection_accepted', {
      proposalId: proposal.id,
      goalId: goal.id,
      goal: goal.name,
      sourceKind: proposal.sourceKind,
      eventId: event.id,
      slotStart: startAt.toISOString(),
      reslotted,
      durationMinutes: PROPOSAL_DURATION_MINUTES,
    })

    return NextResponse.json({ event, proposalId: proposal.id, reslotted, analytics }, { status: 201 })
  } catch (err) {
    console.error('[redirections] accept failed:', err)
    captureServerException(err, { route: '/api/redirections/:id/accept', userId: auth.userId })
    return NextResponse.json({ error: 'Could not accept the redirection.' }, { status: 500 })
  }
}
