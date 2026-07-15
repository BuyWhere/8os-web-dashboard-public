/**
 * /onboarding — entry point.
 *
 * New users land here after sign-up (Clerk forceRedirectUrl) and from marketing
 * CTAs. The functional, persisting onboarding wizard begins at /onboarding/birth
 * (birth → quiz → archetype → goals → define → projects → tasks → dashboard), so
 * this route simply funnels users into it. The previous standalone all-in-one
 * screen here was a non-persisting preview mock; redirecting to /onboarding/birth
 * ensures every new user gets the real, data-backed flow.
 *
 * If the user has already completed onboarding, redirect to dashboard.
 */
import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

export default async function OnboardingIndex() {
  const clerkUser = await currentUser()

  if (clerkUser) {
    // Check if user has already completed onboarding
    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: clerkUser.id },
      select: { onboardingDone: true },
    })

    if (dbUser?.onboardingDone) {
      redirect('/dashboard')
    }
  }

  redirect('/onboarding/birth')
}
