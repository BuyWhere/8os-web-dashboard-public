/**
 * POST /api/memory/dev-detect — QA-only trigger of detectAndStoreCommitment (E-6).
 *
 * The assistant chat route fires detectAndStoreCommitment fire-and-forget after
 * each turn. To assert that logic deterministically the probe calls it directly
 * here with the same user turn. Auth: resolveDevUser. Body: { message }.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDevUser } from '@/lib/memory/qa-auth'
import { detectAndStoreCommitment } from '@/lib/memory/commitment-detect'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const dev = await resolveDevUser(req)
  if (dev instanceof NextResponse) return dev
  const body = await req.json().catch(() => null) as { message?: unknown } | null
  const message = typeof body?.message === 'string' ? body.message : ''
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })
  const result = await detectAndStoreCommitment(dev.userId, message, { sourceId: 'dev-detect' })
  return NextResponse.json(result)
}
