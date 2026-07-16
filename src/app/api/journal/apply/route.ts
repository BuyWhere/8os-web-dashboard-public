/**
 * POST /api/journal/apply
 *   { tasks[], events[], goals[], relationshipFollowups[] }
 *
 * Creates the items the user KEPT from the one-pass journal-extraction review.
 * Reuses the Coach's tool executor so creation is identical (tz-aware, goal-linked,
 * calendar events, etc.). Relationship follow-ups become dated contact tasks.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { executeTool } from '@/lib/assistant-tool-executor'
import { getUserTimezone } from '@/lib/user-time'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId
  const tz = await getUserTimezone(userId).catch(() => 'Asia/Singapore')

  const b = await req.json().catch(() => ({} as any))
  const created = { tasks: 0, events: 0, goals: 0, relationships: 0 }
  const errors: string[] = []

  async function run(name: string, args: any): Promise<any | null> {
    try {
      const r = await executeTool(name as any, args, userId, tz)
      return r && r.error ? null : r
    } catch (e) { errors.push(e instanceof Error ? e.message : 'error'); return null }
  }

  for (const g of (Array.isArray(b?.goals) ? b.goals : []).slice(0, 25)) {
    if (g?.name && await run('create_goal', { name: g.name, horizon: g.horizon, domainId: g.domainId })) created.goals++
  }
  for (const t of (Array.isArray(b?.tasks) ? b.tasks : []).slice(0, 25)) {
    if (t?.name && await run('create_task', { name: t.name, scheduledAt: t.scheduledAt || undefined, goalId: t.goalId || undefined })) created.tasks++
  }
  for (const e of (Array.isArray(b?.events) ? b.events : []).slice(0, 25)) {
    if (!e?.title) continue
    const r = await run('create_calendar_event', { title: e.title, startTime: e.startTime, endTime: e.endTime })
    if (r) {
      created.events++
      // Commitment-bridge: stamp the source commitment so it's never re-proposed.
      if (e.commitmentId && r?.event?.id) {
        await prisma.$executeRawUnsafe(
          `UPDATE commitments SET scheduled_event_id = $1 WHERE id = $2 AND user_id = $3`,
          String(r.event.id), String(e.commitmentId), userId,
        ).catch(() => {})
      }
    }
  }
  for (const r of (Array.isArray(b?.relationshipFollowups) ? b.relationshipFollowups : []).slice(0, 25)) {
    if (r?.person) {
      const name = `Reach out to ${r.person}${r.action ? ` — ${r.action}` : ''}`.slice(0, 200)
      if (await run('create_task', { name, scheduledAt: r.when || undefined, domainId: 'relationships' })) created.relationships++
    }
  }

  return NextResponse.json({ ok: true, created, errors: errors.slice(0, 5) })
}
