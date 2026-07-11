/**
 * POST /api/capture
 * Universal quick-capture. Takes a single free-text input and turns it into
 * exactly one OS object (a task or a goal) using the SAME assistant tool-calling
 * path as /api/assistant/chat (Flow AI + ASSISTANT tools + executeTool), then
 * returns the created object and a short confirmation.
 *
 * This is intentionally a focused, single-shot endpoint: one capture = one object.
 *
 * OS-2652: the classifier + creation logic now lives in src/lib/capture-core.ts
 * (runCapture) so the Telegram webhook shares the exact same path. This route
 * is auth + rate limiting + HTTP shapes around it — behavior unchanged.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { runCapture } from '@/lib/capture-core'
import { captureServerException } from '@/lib/error-track'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  const limited = enforceRateLimit(req, RATE_LIMITS.capture, userId)
  if (limited) return limited

  let body: { text?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  let result
  try {
    result = await runCapture(userId, body.text ?? '')
  } catch (err) {
    console.error('[capture] runCapture failed:', err)
    captureServerException(err, { route: '/api/capture', userId })
    return NextResponse.json({ error: 'Capture failed' }, { status: 500 })
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({
    kind: result.kind,
    object: result.object,
    confirmation: result.confirmation,
    color: result.color,
  })
}
