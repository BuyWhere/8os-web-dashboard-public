import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db/prisma'
import { revokeAllSessions, revokeSession } from '@/lib/auth/session'

/**
 * NOTE (Clerk consolidation): live session lifecycle is now owned by Clerk. The
 * legacy `Session` table only holds rows minted by the retired JWT auth path, so
 * for real Clerk users these lists are typically empty. We keep the route so the
 * settings UI never 401s and so any residual legacy sessions can still be
 * revoked. The gate is `requireAuth` (Clerk session -> app user id; QA header
 * preserved). Clerk-native sign-out is handled by the UI SignOutButton.
 */

/** GET /api/user/sessions — list active (legacy) sessions for the current user */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const sessions = await prisma.session.findMany({
    where: { userId: auth.userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      deviceName: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
  })

  return NextResponse.json({
    sessions: sessions.map((session: {
      id: string
      deviceName: string | null
      ipAddress: string | null
      userAgent: string | null
      createdAt: Date
      expiresAt: Date
    }) => ({
      ...session,
      current: false,
    })),
  })
}

/** DELETE /api/user/sessions — revoke a specific legacy session by id, or all */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('id')

  if (sessionId) {
    // Verify the session belongs to this user
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: auth.userId },
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    await revokeSession(sessionId)
    return NextResponse.json({ message: 'Session revoked', currentSessionRevoked: false })
  }

  // Revoke all legacy sessions
  await revokeAllSessions(auth.userId)
  return NextResponse.json({ message: 'All sessions revoked', currentSessionRevoked: false })
}
