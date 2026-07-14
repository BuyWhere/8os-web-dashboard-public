import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Press | 8os.ai',
  description: 'Press information, story angles, key facts, and media contact for 8os.ai.',
  keywords: ['8os press', '8os media', '8os.ai press kit'],
}

const storyAngles = [
  {
    title: 'The productivity system you were born with',
    description:
      '8os.ai argues that most productivity advice fails because it ignores the most fundamental variable: the person. BaZi\'s Five Elements reveal five distinct operating modes, each with different strengths, timing windows, and goal structures. The story of why one-size-fits-all productivity is broken and what comes next.',
  },
  {
    title: 'BaZi goes mainstream: Ancient Chinese metaphysics meets modern goal-setting',
    description:
      '8os.ai is bringing a 2,000-year-old system to a 2026 audience, without the mysticism. By stripping BaZi down to its operational core (your elemental operating mode, timing cycles, and daily guidance), 8os has built something that resonates with people who would never pick up a horoscope.',
  },
  {
    title: "The personality test that doesn't change",
    description:
      'MBTI types shift for 50% of people within five weeks. Enneagram subtypes are hard to pin down. BaZi elements, derived from your birth date, don\'t change. 8os argues this stability is what makes elemental operating systems more useful for long-term goal planning.',
  },
  {
    title: 'Building a personal OS for the era of AI overwhelm',
    description:
      'As AI floods the world with more information and options, the bottleneck becomes human decision-making. 8os argues that a stable personal operating system, one that tells you how you work best, when to act, and which inputs to filter, becomes increasingly valuable.',
  },
  {
    title: 'No birth time, no problem: Rethinking BaZi for the modern world',
    description:
      'Traditional BaZi requires an exact birth time. 8os\'s founder identified that birth time data is unreliable for over 70% of people and built a methodology that doesn\'t depend on it. The result: a more accessible, more democratic form of elemental self-knowledge.',
  },
]

const keyFacts = [
  { label: 'Founded', value: '2026' },
  { label: 'Headquarters', value: 'Remote-first' },
  { label: 'Users', value: '5,000+' },
  { label: 'Free to start', value: 'Yes, no credit card' },
  { label: 'Archetypes', value: '5 (Metal, Water, Wood, Fire, Earth)' },
  { label: 'Blog articles', value: '20+' },
  { label: 'No birth time required', value: 'Yes' },
  { label: 'API available', value: 'Yes (on paid plans)' },
]

const boilerplate = `8os.ai is a personal operating system built on BaZi (Chinese metaphysical system) and Western astrology. The platform reveals a user's dominant element, Metal, Water, Wood, Fire, or Earth, and translates it into actionable guidance for goal-setting, productivity, timing, and daily decision-making. 8os is free to start, requires no birth time, and takes 90 seconds to discover your archetype. Available at 8os.ai.`

export default function PressPage() {
  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: 'var(--color-border)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '56px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, color: 'var(--color-bg-secondary)', marginBottom: '16px' }}>
            Press
          </h1>
          <div
            style={{
              background: '#0f0f1a',
              border: '1px solid #3730a3',
              borderRadius: '12px',
              padding: '20px 24px',
            }}
          >
            <p style={{ fontSize: '17px', color: '#a5b4fc', fontWeight: 500, lineHeight: 1.6 }}>
              8os.ai is a personal operating system built on BaZi and Western astrology, revealing
              your dominant element and translating it into a practical system for goals, productivity,
              and timing. Free. 90 seconds. No birth time needed.
            </p>
          </div>
        </div>

        {/* Story Angles */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '24px' }}>
            Story Angles
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {storyAngles.map((angle, i) => (
              <div
                key={i}
                style={{
                  background: '#0f0f0f',
                  border: '1px solid #1e1e2e',
                  borderRadius: '12px',
                  padding: '24px',
                }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '10px' }}>
                  {i + 1}. {angle.title}
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.7 }}>
                  {angle.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Key Facts */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '24px' }}>
            Key Facts
          </h2>
          <div
            style={{
              background: '#0f0f0f',
              border: '1px solid #1e1e2e',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {keyFacts.map((fact, i) => (
              <div
                key={fact.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  borderBottom: i < keyFacts.length - 1 ? '1px solid #1e1e2e' : 'none',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 500 }}>{fact.label}</span>
                <span style={{ color: 'var(--color-bg-secondary)', fontSize: '14px', fontWeight: 600 }}>{fact.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Boilerplate */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '16px' }}>
            About 8os.ai (Boilerplate)
          </h2>
          <div
            style={{
              background: '#0f0f0f',
              border: '1px solid #1e1e2e',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', lineHeight: 1.8 }}>{boilerplate}</p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '16px' }}>
            Media Contact
          </h2>
          <div
            style={{
              background: '#0f0f1a',
              border: '1px solid #1e1b4b',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '12px' }}>
              For press inquiries, interview requests, and fact-checking:
            </p>
            <a
              href="mailto:press@8os.ai"
              style={{
                color: '#7c3aed',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              press@8os.ai
            </a>
            <p style={{ color: '#475569', fontSize: '13px', marginTop: '10px' }}>
              We respond to media inquiries within 24 hours on business days.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
