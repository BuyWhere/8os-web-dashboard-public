/**
 * /api/inbox/messages — the web-inbox channel's read/mark/delete API (OS-2652, OS-5946).
 *
 * NOTE: this deliberately lives UNDER /api/inbox rather than replacing it —
 * GET /api/inbox is the pre-existing TASK inbox (unscheduled tasks, consumed
 * by InboxList.tsx) and must keep working unchanged.
 *
 * GET    — list the user's inbox_messages, reverse-chron, + unreadCount.
 *          ?countOnly=1 returns just { unreadCount } (Sidebar badge).
 *          ?limit=N (default 50, max 200).
 * PATCH  — mark read/unread: { ids: string[] } or { all: true }, optional
 *          { read: boolean } (default true). userId-scoped updateMany.
 * DELETE — dismiss/archive messages: { ids: string[] } or { all: true }.
 *          userId-scoped deleteMany (OS-5946).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  try {
    const sp = req.nextUrl.searchParams
    const unreadCount = await prisma.inboxMessage.count({ where: { userId, read: false } })
    if (sp.get('countOnly') === '1') {
      return NextResponse.json({ unreadCount })
    }

    const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '50', 10) || 50, 1), 200)
    const rows = await prisma.inboxMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      unreadCount,
      messages: rows.map((m) => ({
        id: m.id,
        title: m.title,
        body: m.body,
        actions: m.actionsJson ?? [],
        meta: m.meta ?? null,
        read: m.read,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('[inbox/messages] GET failed:', e)
    return NextResponse.json({ error: 'Could not load inbox messages.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  let body: { ids?: unknown; all?: unknown; read?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const read = body.read === false ? false : true
  const all = body.all === true
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string').slice(0, 200) : []
  if (!all && ids.length === 0) {
    return NextResponse.json({ error: 'Provide ids: string[] or all: true' }, { status: 400 })
  }

  try {
    const result = await prisma.inboxMessage.updateMany({
      where: { userId, ...(all ? {} : { id: { in: ids } }) },
      data: { read },
    })
    return NextResponse.json({ updated: result.count, read })
  } catch (e) {
    console.error('[inbox/messages] PATCH failed:', e)
    return NextResponse.json({ error: 'Could not update inbox messages.' }, { status: 500 })
  }
}

// OS-5946: dismiss/archive individual messages
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  let body: { ids?: unknown; all?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const all = body.all === true
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string').slice(0, 200) : []
  if (!all && ids.length === 0) {
    return NextResponse.json({ error: 'Provide ids: string[] or all: true' }, { status: 400 })
  }

  try {
    const result = await prisma.inboxMessage.deleteMany({
      where: { userId, ...(all ? {} : { id: { in: ids } }) },
    })
    return NextResponse.json({ deleted: result.count })
  } catch (e) {
    console.error('[inbox/messages] DELETE failed:', e)
    return NextResponse.json({ error: 'Could not delete inbox messages.' }, { status: 500 })
  }
}
