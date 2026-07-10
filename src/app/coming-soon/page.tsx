import type { Metadata } from 'next'
import Link from 'next/link'
import ComingSoonForm from '@/components/landing/ComingSoonForm'

// OS-1173: prelaunch landing page — the canonical surface for capturing
// early-access + affiliate-program opt-ins before the 2026-07-07 PH launch.
// Server component (per OS-1056 SSR pattern) so Googlebot sees the full
// copy and the form on first byte; the form itself is a client island.
export const metadata: Metadata = {
  title: '8os — Coming July 7, 2026 | Reserve Early Access',
  description:
    '8os is a personalized operating system powered by BaZi. Reserve your spot for the July 7, 2026 launch. Pre-launch affiliates earn 30% recurring.',
  keywords: [
    '8os coming soon',
    '8os prelaunch',
    'early access 8os',
    '8os affiliate program',
    'personalized operating system',
    'BaZi AI',
  ],
  alternates: {
    canonical: '/coming-soon',
  },
  openGraph: {
    type: 'website',
    url: 'https://8os.ai/coming-soon',
    siteName: '8os',
    title: '8os — Coming July 7, 2026 | Reserve Early Access',
    description:
      'A personalized operating system unique to you. Powered by BaZi. Launching July 7, 2026.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '8os — Coming July 7, 2026',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: '8os — Coming July 7, 2026',
    description:
      'A personalized operating system unique to you. Powered by BaZi. Reserve your spot now.',
    images: ['/og-image.png'],
    creator: '@8os',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function ComingSoonPage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: '100vh',
        padding: '6rem 2rem 4rem',
        background: 'var(--color-bg-primary)',
      }}
    >
      <div style={{ maxWidth: '720px', width: '100%' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          Launching July 7, 2026
        </div>

        <h1
          style={{
            fontSize: '3.25rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem',
            color: '#e2e8f0',
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          A personalized operating system.
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Coming soon.
          </span>
        </h1>

        <p
          style={{
            fontSize: '1.15rem',
            lineHeight: 1.6,
            color: '#a3a3a3',
            marginBottom: '2.5rem',
            textAlign: 'center',
            maxWidth: '560px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          8os reads your BaZi archetype and turns it into a daily operating system — goals timed
          to your element, tasks matched to your day, and an AI that knows you. Reserve your spot
          for the July 7 launch.
        </p>

        <div style={{ marginBottom: '2.5rem' }}>
          <ComingSoonForm source="coming-soon" ctaLabel="Reserve my spot" />
        </div>

        <section
          aria-label="What you get"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2.5rem',
          }}
        >
          {[
            {
              title: 'Free during beta',
              body: 'Core archetype, daily briefing, and goals. No credit card.',
            },
            {
              title: 'Founding-affiliate rates',
              body: '30% recurring on Pro + Agent Connect. Pre-launch list locks the rate.',
            },
            {
              title: 'Early-access email',
              body: 'Launch announcement, archetype deep-dive, and onboarding link in one send.',
            },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '1.25rem',
              }}
            >
              <h3
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                  color: '#fff',
                }}
              >
                {card.title}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.5, margin: 0 }}>
                {card.body}
              </p>
            </div>
          ))}
        </section>

        <section
          aria-label="How it works"
          style={{
            marginBottom: '2.5rem',
            padding: '1.75rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
          }}
        >
          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 600,
              marginBottom: '1rem',
              color: '#fff',
            }}
          >
            What happens after you reserve
          </h2>
          <ol style={{ paddingLeft: '1.25rem', color: '#a3a3a3', lineHeight: 1.7, margin: 0 }}>
            <li style={{ marginBottom: '0.4rem' }}>
              We email you a launch-day link on July 7, 2026.
            </li>
            <li style={{ marginBottom: '0.4rem' }}>
              If you opted into the affiliate program, we follow up with onboarding + your
              unique tracking link before launch.
            </li>
            <li>
              You get a 2-minute archetype reveal on first login — no birth time required.
            </li>
          </ol>
        </section>

        <nav
          aria-label="Cross-links"
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Link
            href="/"
            style={{
              color: '#a3a3a3',
              fontSize: '0.9rem',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'border-color 0.2s',
            }}
          >
            ← Homepage
          </Link>
          <Link
            href="/how-it-works"
            style={{ color: '#a3a3a3', fontSize: '0.9rem', textDecoration: 'none' }}
          >
            How it works
          </Link>
          <Link
            href="/pricing"
            style={{ color: '#a3a3a3', fontSize: '0.9rem', textDecoration: 'none' }}
          >
            Pricing
          </Link>
          <Link
            href="/quiz"
            style={{ color: '#a3a3a3', fontSize: '0.9rem', textDecoration: 'none' }}
          >
            Take the archetype quiz
          </Link>
        </nav>
      </div>
    </main>
  )
}
