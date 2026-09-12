import type { Metadata } from 'next'
import ComingSoonForm from '@/components/landing/ComingSoonForm'
import { LiveCounter } from '@/components/LiveCounter'

// OS-6970: restore /waitlist page lost during Clerk migration (3ea2a2f).
// The page previously existed but was removed during the session-tree reconcile
// and never restored. The API routes (count, join, stats) were kept.

export const metadata: Metadata = {
  title: 'Join the 8os Waitlist',
  description:
    'Reserve your spot on the 8os waitlist. Get early access to your personalized life operating system built around your BaZi archetype.',
  alternates: { canonical: '/waitlist' },
}

export default function WaitlistPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'var(--color-bg-primary)',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: '0.5rem',
              lineHeight: 1.1,
            }}
          >
            Reserve your spot.
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              marginBottom: '0.75rem',
              lineHeight: 1.6,
            }}
          >
            8os computes your BaZi archetype and decade-to-daily timing, then runs your goals and calendar around it — driven by an AI assistant.
          </p>
          <LiveCounter />
        </div>

        <ComingSoonForm source="waitlist" ctaLabel="Reserve my spot" />
      </div>
    </main>
  )
}
