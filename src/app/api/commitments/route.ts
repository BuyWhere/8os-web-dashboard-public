/**
 * /api/commitments — list + status transitions (E-6, backlog §3.3).
 *
 * Clerk-authed (requireAuth), userId-scoped. Relation-free table → raw SQL.
 *
 *   GET   — list this user's commitments. ?status=open|done|renegotiated|dropped
 *           filters; default returns open + overdue. Newest first.
 *   PATCH — status transition: { id, status, dueDate?, dropReason? }.
 *           done                    → status='done'
 *           renegotiate (new date)  → status is normalized to 'renegotiated'
 *                                      when a new dueDate is supplied AND the
 *                                      commitment stays actionable (kept 'open'
 *                                      with the new date so it re-surfaces).
 *                                      We record 'renegotiated' as the terminal
 *                                      status ONLY when the caller sends it
 *                                      explicitly; the brief flow moves the date
 *                                      and keeps it open.
 *           drop(reason)            → status='dropped', drop_reason stored
 *
 * The inbox action ids `cm:<id>:done|renegotiate|drop` map onto this endpoint.
 *
 * Node runtime.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authOrQa } from '@/lib/memory/qa-auth'
import { captureServerEvent } from '@/lib/analytics-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUSES = new Set(['open', 'done', 'renegotiated', 'dropped'])

interface Row {
  id: string
  content: string
  due_date: Date | null
  status: string
  goal_id: string | null
  drop_reason: string | null
  created_at: Date
  updated_at: Date
}

function toDateOnly(d: Date | null): string | null {
  if (!d) return null
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toISOString().slice(0, 10)
}

function serialize(r: Row) {
  return {
    id: r.id,
    content: r.content,
    dueDate: toDateOnly(r.due_date),
    status: r.status,
    goalId: r.goal_id,
    dropReason: r.drop_reason,
    createdAt: (r.created_at instanceof Date ? r.created_at : new Date(r.created_at)).toISOString(),
    updatedAt: (r.updated_at instanceof Date ? r.updated_at : new Date(r.updated_at)).toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth
  const status = req.nextUrl.searchParams.get('status')

  let rows: Row[]
  if (status && STATUSES.has(status)) {
    rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT id, content, due_date, status, goal_id, drop_reason, created_at, updated_at
         FROM commitments WHERE user_id = $1 AND status = $2
         ORDER BY due_date NULLS LAST, created_at DESC LIMIT 500`,
      auth.userId, status,
    ).catch(() => [] as Row[])
  } else {
    // Default: everything still actionable (open), newest / soonest first.
    rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT id, content, due_date, status, goal_id, drop_reason, created_at, updated_at
         FROM commitments WHERE user_id = $1 AND status = 'open'
         ORDER BY due_date NULLS LAST, created_at DESC LIMIT 500`,
      auth.userId,
    ).catch(() => [] as Row[])
  }
  return NextResponse.json({ commitments: rows.map(serialize), count: rows.length })
}

export async function PATCH(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null) as
    | { id?: unknown; status?: unknown; dueDate?: unknown; dropReason?: unknown }
    | null
  const id = typeof body?.id === 'string' ? body.id : ''
  const status = typeof body?.status === 'string' ? body.status : ''
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // renegotiate == set a new due_date and keep it open so it re-surfaces on the
  // new day. Callers may pass status:'renegotiate' (alias) with a dueDate.
  const dueDate = typeof body?.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate.trim())
    ? body.dueDate.trim()
    : null

  let rows: Row[] = []
  if (status === 'done') {
    rows = await prisma.$queryRawUnsafe<Row[]>(
      `UPDATE commitments SET status='done', updated_at=now()
         WHERE id=$1 AND user_id=$2
         RETURNING id, content, due_date, status, goal_id, drop_reason, created_at, updated_at`,
      id, auth.userId,
    ).catch(() => [] as Row[])
  } else if (status === 'dropped' || status === 'drop') {
    const reason = typeof body?.dropReason === 'string' ? body.dropReason.trim().slice(0, 500) : null
    rows = await prisma.$queryRawUnsafe<Row[]>(
      `UPDATE commitments SET status='dropped', drop_reason=$3, updated_at=now()
         WHERE id=$1 AND user_id=$2
         RETURNING id, content, due_date, status, goal_id, drop_reason, created_at, updated_at`,
      id, auth.userId, reason,
    ).catch(() => [] as Row[])
  } else if (status === 'renegotiate' || status === 'renegotiated') {
    if (!dueDate) return NextResponse.json({ error: 'renegotiate requires a new dueDate (YYYY-MM-DD)' }, { status: 400 })
    // Keep it actionable: move the date, stay open so the brief re-surfaces it.
    rows = await prisma.$queryRawUnsafe<Row[]>(
      `UPDATE commitments SET due_date=$3::date, status='open', updated_at=now()
         WHERE id=$1 AND user_id=$2
         RETURNING id, content, due_date, status, goal_id, drop_reason, created_at, updated_at`,
      id, auth.userId, dueDate,
    ).catch(() => [] as Row[])
  } else {
    return NextResponse.json({ error: 'status must be done | renegotiate | drop' }, { status: 400 })
  }

  if (rows.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 })
  // §4.4 funnel: `commitment_closed` — a commitment reached a terminal state
  // (kept/done or dropped). Renegotiate stays open, so it does NOT close.
  if (status === 'done' || status === 'dropped' || status === 'drop') {
    try { captureServerEvent(auth.userId, 'commitment_closed', { outcome: rows[0].status }) } catch {}
  }
  return NextResponse.json(serialize(rows[0]))
}
