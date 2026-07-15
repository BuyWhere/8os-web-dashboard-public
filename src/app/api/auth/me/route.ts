import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      emailVerified: true,
      phoneVerified: true,
      onboardingDone: true,
      totpEnabled: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user, sessionId: auth.sessionId })
}
