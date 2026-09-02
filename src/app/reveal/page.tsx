import type { Metadata } from 'next'
import RevealClient from './RevealClient'

// PUBLIC route (NOT Clerk-gated — see middleware: /reveal is not in the
// protected matcher). Free pre-signup archetype taste + shareable OG card.

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { name?: string; element?: string }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const name = typeof searchParams.name === 'string' ? searchParams.name : ''
  const element = typeof searchParams.element === 'string' ? searchParams.element : 'earth'

  // When a shared link carries ?name=&element=, point og:image at the dynamic
  // branded archetype card so the share preview shows THAT archetype.
  const ogImage = name
    ? `/api/og/archetype?name=${encodeURIComponent(name)}&element=${encodeURIComponent(element)}`
    : `/api/og/archetype?name=${encodeURIComponent('Your Archetype')}&element=earth`

  const title = name
    ? `${name}, my 8os archetype`
    : 'See your archetype free, 8os'
  const description = name
    ? `${name}. Right goal, right season, the planner that knows when to push. Reveal yours free on 8os.`
    : 'Enter your birth date and instantly see your archetype, free, no account. Right goal, right season.'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      url: '/reveal',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default function RevealPage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '3.5rem 1.5rem 4rem',
        background:
          'radial-gradient(1100px 480px at 50% -8%, #FFE9CE 0%, rgba(255,233,206,0) 60%), var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
      }}
    >
      <section style={{ textAlign: 'center', maxWidth: '620px', margin: '0 0 2.5rem' }}>
        <div
          style={{
            display: 'inline-block',
            fontSize: '0.8125rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
            background: 'var(--color-accent-soft)',
            padding: '0.4rem 0.9rem',
            borderRadius: '999px',
            marginBottom: '1.25rem',
          }}
        >
          Free · no account needed
        </div>
        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            margin: '0 0 1rem',
          }}
        >
          See your archetype
          <br />
          <span
            style={{
              background: 'var(--color-accent-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            before you sign up.
          </span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto' }}>
          Your birth chart names how you operate and what season you&apos;re in.
          Enter your date (city optional), meet your archetype, and read your current season,
          no signup, nothing stored.
        </p>
      </section>

      <RevealClient />
    </main>
  )
}
