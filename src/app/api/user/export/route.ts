import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db/prisma'

/** GET /api/user/export — GDPR data export (JSON download) */
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
      updatedAt: true,
      sessions: {
        where: { revokedAt: null },
        select: { id: true, deviceName: true, ipAddress: true, createdAt: true, expiresAt: true },
      },
      quizResponses: {
        select: { questionId: true, answer: true, answeredAt: true },
      },
      archetypeResult: {
        select: {
          archetypeId: true,
          archetypeName: true,
          confidence: true,
          dominantElements: true,
          personalityVector: true,
          isHybrid: true,
          hybridSecondary: true,
          createdAt: true,
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      onboardingDone: user.onboardingDone,
      totpEnabled: user.totpEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    sessions: user.sessions,
    quizResponses: user.quizResponses,
    archetypeResult: user.archetypeResult,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="8os-data-export-${user.id}.json"`,
    },
  })
}
