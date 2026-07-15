import { NextRequest, NextResponse } from 'next/server'
import { caldiyApi, CalDiyApiError } from '@/lib/caldiy/client'
import { requireAuth } from '@/lib/auth/require-auth'

/**
 * GET /api/cal-diy/event-types — List Cal.diy event types for the user.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const data = await caldiyApi.eventTypes.list()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof CalDiyApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Failed to fetch Cal.diy event types' }, { status: 500 })
  }
}
