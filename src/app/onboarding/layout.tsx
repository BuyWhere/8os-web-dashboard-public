/**
 * Onboarding layout — warm editorial.
 *
 * Loads Fraunces (headings) + Inter (body) via next/font/google (built into
 * Next, no dependency change) and exposes them as CSS variables scoped to the
 * onboarding wrapper, mirroring the landing page. Paints the cream app
 * background so every onboarding step reads as one continuous, warm surface.
 *
 * PostHogProvider included here (on top of (dashboard)/layout) so onboarding
 * step pageviews are tracked from the moment a user completes signup.
 * The _initialized guard in PostHogProvider prevents double-init if both
 * layouts mount in the same session.
 */
import { PostHogProvider } from '@/components/PostHogProvider'
import { Inter } from 'next/font/google'
import { redirect } from 'next/navigation'
import { getServerAppUserId } from '@/lib/auth/server-user'
import { prisma } from '@/lib/db/prisma'

const fraunces = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Guard: an already-onboarded user should never re-enter the onboarding flow
  // (they could accidentally re-submit birth/quiz/archetype). Send them home.
  const userId = await getServerAppUserId('/onboarding')
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { onboardingDone: true } })
  if (u?.onboardingDone) redirect('/dashboard')

  return (
    <PostHogProvider>
      <div
        className={`${fraunces.variable} ${inter.variable}`}
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-sans), Inter, system-ui, sans-serif',
        }}
      >
        {children}
      </div>
    </PostHogProvider>
  )
}
