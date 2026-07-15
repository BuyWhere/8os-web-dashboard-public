/**
 * /api/memory — the user-visible Life Memory surface (E-5, backlog §3.2).
 *
 * The trust / correction / GDPR half of the memory layer. Clerk-authed
 * (requireAuth), userId-scoped. Relation-free table → raw SQL (mirrors the
 * agent-context memory read path).
 *
 *   GET    — list this user's memory_items (non-superseded), grouped-friendly:
 *            [{ id, kind, content, salience, pinned, sourceKind, createdAt,
 *               lastConfirmedAt }] ordered pinned-first, salience desc, recency.
 *   POST   — user-manual add: { kind, content, salience?, pinned? }.
 *            source_kind = 'user_manual'.
 *   PATCH  — edit / pin: { id, content?, salience?, pinned? }.
 *   DELETE — hard-delete: ?id=<id>. Also flags the source content as
 *            memory-excluded (best-effort tombstone) so consolidation won't
 *            re-derive the same item next night.
 *
 * Node runtime.
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { authOrQa } from '@/lib/memory/qa-auth'
import { captureServerEvent } from '@/lib/analytics-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KINDS = new Set(['fact', 'preference', 'person', 'insight', 'event'])

interface Row {
  id: string
  kind: string
  content: string
  salience: number
  pinned: boolean
  source_kind: string | null
  source_id: string | null
  created_at: Date
  last_confirmed_at: Date
}

function serialize(r: Row) {
  return {
    id: r.id,
    kind: r.kind,
    content: r.content,
    salience: Number(r.salience),
    pinned: r.pinned,
    sourceKind: r.source_kind,
    createdAt: (r.created_at instanceof Date ? r.created_at : new Date(r.created_at)).toISOString(),
    lastConfirmedAt: (r.last_confirmed_at instanceof Date ? r.last_confirmed_at : new Date(r.last_confirmed_at)).toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT id, kind, content, salience, pinned, source_kind, source_id, created_at, last_confirmed_at
       FROM memory_items
       WHERE user_id = $1 AND superseded_by IS NULL
       ORDER BY pinned DESC, salience DESC, last_confirmed_at DESC
       LIMIT 500`,
    auth.userId,
  ).catch(() => [] as Row[])
  return NextResponse.json({ items: rows.map(serialize), count: rows.length })
}

export async function POST(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null) as
    | { kind?: unknown; content?: unknown; salience?: unknown; pinned?: unknown }
    | null
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  const kind = String(body.kind ?? '').toLowerCase()
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!KINDS.has(kind)) return NextResponse.json({ error: 'kind must be one of fact|preference|person|insight|event' }, { status: 400 })
  if (content.length < 2) return NextResponse.json({ error: 'content required' }, { status: 400 })
  let salience = Math.round(Number(body.salience))
  if (!Number.isFinite(salience)) salience = 3
  salience = Math.min(5, Math.max(1, salience))
  const pinned = body.pinned === true
  const id = randomUUID()
  await prisma.$executeRawUnsafe(
    `INSERT INTO memory_items (id, user_id, kind, content, salience, source_kind, source_id, pinned)
       VALUES ($1,$2,$3,$4,$5,'user_manual',NULL,$6)`,
    id, auth.userId, kind, content.slice(0, 1000), salience, pinned,
  )
  return NextResponse.json({ id, kind, content, salience, pinned, sourceKind: 'user_manual' }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null) as
    | { id?: unknown; content?: unknown; salience?: unknown; pinned?: unknown }
    | null
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sets: string[] = []
  const args: unknown[] = []
  let n = 1
  if (typeof body?.content === 'string' && body.content.trim().length >= 2) {
    sets.push(`content = $${++n}`); args.push(body.content.trim().slice(0, 1000))
  }
  if (body?.salience !== undefined) {
    let s = Math.round(Number(body.salience))
    if (Number.isFinite(s)) { s = Math.min(5, Math.max(1, s)); sets.push(`salience = $${++n}`); args.push(s) }
  }
  if (typeof body?.pinned === 'boolean') { sets.push(`pinned = $${++n}`); args.push(body.pinned) }
  if (sets.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  // Always bump last_confirmed_at on an explicit user edit.
  sets.push('last_confirmed_at = now()')

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `UPDATE memory_items SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $${++n}
       RETURNING id, kind, content, salience, pinned, source_kind, source_id, created_at, last_confirmed_at`,
    id, ...args, auth.userId,
  ).catch(() => [] as Row[])
  if (rows.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 })
  // §4.4 funnel: `memory_edited` — the user curated what 8os knows about them.
  try {
    captureServerEvent(auth.userId, 'memory_edited', {
      changed: [
        typeof body?.content === 'string' ? 'content' : null,
        body?.salience !== undefined ? 'salience' : null,
        typeof body?.pinned === 'boolean' ? 'pinned' : null,
      ].filter(Boolean),
    })
  } catch {}
  return NextResponse.json(serialize(rows[0]))
}

export async function DELETE(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth
  const id = req.nextUrl.searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 })

  // Read the source pointer first so we can tombstone it (memory-excluded).
  const found = await prisma.$queryRawUnsafe<{ source_kind: string | null; source_id: string | null }[]>(
      `SELECT source_kind, source_id FROM memory_items WHERE id = $1 AND user_id = $2`,
      id, auth.userId,
    ).catch(() => [])

  const del = await prisma.$executeRawUnsafe(
    `DELETE FROM memory_items WHERE id = $1 AND user_id = $2`,
    id, auth.userId,
  ).catch(() => 0)

  if (!del) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Best-effort: flag the source content memory-excluded so the nightly
  // consolidation does not re-derive this item. Stored as a tombstone row.
  const src = found[0]
  if (src?.source_id) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO memory_items (id, user_id, kind, content, salience, source_kind, source_id, superseded_by)
         VALUES ($1,$2,'excluded',$3,1,$4,$5,$1)`,
      randomUUID(), auth.userId,
      `[memory-excluded] user deleted a derived memory from ${src.source_kind ?? 'source'}#${src.source_id}`,
      src.source_kind, src.source_id,
    ).catch(() => {})
  }

  return NextResponse.json({ deleted: true, id })
}
