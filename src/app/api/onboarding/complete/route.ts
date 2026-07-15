import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { captureServerEvent } from '@/lib/analytics-server'

/**
 * POST /api/onboarding/complete — mark the onboarding wizard as finished.
 *
 * Called from the final wizard step (app/onboarding/tasks/page.tsx "Enter your
 * OS →") right before the user lands on the dashboard. The archetype step only
 * ever set onboardingDone=false ("full done only after goals step"), so nothing
 * previously flipped it to true — this closes that gap.
 *
 * Idempotent: a repeat call is a harmless no-op. It never blocks the dashboard —
 * the client fires it best-effort and navigates regardless of the outcome.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const current = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { onboardingDone: true },
  })

  if (current && !current.onboardingDone) {
    await prisma.user.update({
      where: { id: auth.userId },
      data: { onboardingDone: true },
    })
    captureServerEvent(auth.userId, 'onboarding_completed', {})
  }

  return NextResponse.json({ onboardingDone: true })
}
