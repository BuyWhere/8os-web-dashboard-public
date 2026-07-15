/**
 * /api/coach/plays — owner-gated CRUD for the curated Coach playbook layer.
 * Gate: COACH_ADMIN_EMAILS env allow-list (or an admin role). Non-admins get 403.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db/prisma'
import { listPlays, createPlay, updatePlay, deletePlay, isCoachAdmin } from '@/lib/coach/plays'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function gate(req: NextRequest): Promise<{ res?: NextResponse; userId?: string }> {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return { res: auth }
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { email: true, role: true } })
  if (!isCoachAdmin(user?.email, user?.role as string | null)) {
    return { res: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  }
  return { userId: auth.userId }
}

export async function GET(req: NextRequest) {
  const g = await gate(req); if (g.res) return g.res
  return NextResponse.json({ plays: await listPlays() })
}

export async function POST(req: NextRequest) {
  const g = await gate(req); if (g.res) return g.res
  const b = await req.json().catch(() => ({} as any))
  if (!b?.title || !b?.body) return NextResponse.json({ error: 'title and body required' }, { status: 400 })
  await createPlay({ title: String(b.title), topic: b.topic ? String(b.topic) : '', body: String(b.body), priority: Number(b.priority) || 0 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const g = await gate(req); if (g.res) return g.res
  const b = await req.json().catch(() => ({} as any))
  if (!b?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await updatePlay(String(b.id), {
    title: b.title !== undefined ? String(b.title) : undefined,
    topic: b.topic !== undefined ? String(b.topic) : undefined,
    body: b.body !== undefined ? String(b.body) : undefined,
    enabled: b.enabled !== undefined ? Boolean(b.enabled) : undefined,
    priority: b.priority !== undefined ? Number(b.priority) : undefined,
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const g = await gate(req); if (g.res) return g.res
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await deletePlay(id)
  return NextResponse.json({ ok: true })
}
