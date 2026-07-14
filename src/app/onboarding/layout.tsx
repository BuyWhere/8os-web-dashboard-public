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
import { Fraunces, Inter } from 'next/font/google'

const fraunces = Fraunces({
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

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
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
