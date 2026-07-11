import { NextRequest, NextResponse } from 'next/server'
import { caldiyApi, CalDiyApiError } from '@/lib/caldiy/client'
import { requireAuth } from '@/lib/auth/require-auth'

/**
 * GET /api/cal-diy/bookings — Proxy Cal.diy bookings into 8os.
 * Returns Cal.diy bookings in the shape CalendarView expects.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') || undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

  try {
    const data = await caldiyApi.bookings.list({ status, limit })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof CalDiyApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Failed to fetch Cal.diy bookings' }, { status: 500 })
  }
}
