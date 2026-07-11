/**
 * POST /api/goals/hygiene — E-10 goal-hygiene actions (backlog §5).
 *
 * Body: { goalId: string, action: 'recommit' | 'shrink' | 'retire', note?: string }
 *   - recommit → auto-proposes a recurring focus block (E-7 ensureProposal / findBestSlot)
 *   - shrink   → the agent drafts a smaller goal version (returned for confirmation)
 *   - retire   → goals.status='archived' + a one-line "goal funeral" reflection
 *                saved to journal + memory (framed as a WIN of focus)
 *
 * SCHEMA-FREE. Auth: authOrQa (real Clerk user, or a @qa.8os.ai user via the
 * X-QA-USER-ID header) — you can only act on your OWN goals (the helpers scope
 * every query by userId).
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authOrQa } from '@/lib/memory/qa-auth'
import { applyHygieneAction, detectStarvingGoals } from '@/lib/goal-hygiene'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/goals/hygiene → the user's flagged (starving) top-priority goals. */
export async function GET(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth
  const starving = await detectStarvingGoals(auth.userId)
  return NextResponse.json({ starving })
}

const Schema = z.object({
  goalId: z.string().min(1),
  action: z.enum(['recommit', 'shrink', 'retire']),
  note: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const outcome = await applyHygieneAction(auth.userId, parsed.data.goalId, parsed.data.action, parsed.data.note)
  return NextResponse.json({ ok: true, ...outcome })
}
