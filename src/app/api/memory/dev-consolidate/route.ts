/**
 * POST /api/memory/dev-consolidate — QA-only trigger for consolidateUser (E-5/E-6).
 *
 * The nightly consolidation normally fires from the heartbeat tick at 3am local.
 * For the memory probe we drive it on demand. Auth: resolveDevUser — a Clerk QA
 * session OR an X-QA-USER-ID header naming a @qa.8os.ai user (see qa-auth.ts).
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDevUser } from '@/lib/memory/qa-auth'
import { consolidateUser } from '@/lib/memory/extract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const dev = await resolveDevUser(req)
  if (dev instanceof NextResponse) return dev
  const result = await consolidateUser(dev.userId)
  return NextResponse.json({ userId: dev.userId, ...result })
}
