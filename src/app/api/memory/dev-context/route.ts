/**
 * GET /api/memory/dev-context — QA-only read of assembleAgentContext (E-3/E-5).
 *
 * Returns the assembled context (incl. the memory block) so the probe can assert
 * a deleted memory item is absent from a fresh context. Auth: resolveDevUser.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDevUser } from '@/lib/memory/qa-auth'
import { assembleAgentContext } from '@/lib/agent-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const dev = await resolveDevUser(req)
  if (dev instanceof NextResponse) return dev
  const ctx = await assembleAgentContext(dev.userId, 'daily_brief')
  return NextResponse.json({ memory: ctx.memory, text: ctx.text })
}
