import Link from 'next/link'
import type { Metadata } from 'next'
import { QuizCtaButton } from '@/components/QuizCtaButton'

export const metadata: Metadata = {
  title: 'BaZi Archetype Quiz, Discover Your Element | 8os.ai',
  description:
    'Take the free 8os archetype quiz. Discover your BaZi element, Metal, Water, Wood, Fire, or Earth, and get your personal operating system in 90 seconds.',
  keywords: [
    'BaZi quiz',
    'archetype quiz',
    'BaZi element test',
    'personality quiz BaZi',
    'five elements quiz',
    'what is my BaZi element',
  ],
  alternates: {
    canonical: '/quiz',
  },
  openGraph: {
    title: 'BaZi Archetype Quiz, Discover Your Element | 8os.ai',
    description:
      'Take the free 8os archetype quiz. Discover your BaZi element, Metal, Water, Wood, Fire, or Earth, and get your personal operating system in 90 seconds.',
    url: 'https://8os.ai/quiz',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaZi Archetype Quiz, Discover Your Element | 8os.ai',
    description:
      'Take the free 8os archetype quiz. Discover your BaZi element, Metal, Water, Wood, Fire, or Earth, and get your personal operating system in 90 seconds.',
  },
}

const archetypes = [
  {
    name: 'Strategic Commander',
    element: 'Metal',
    color: 'var(--color-text-muted)',
    bg: '#1a1f2e',
    description: 'Decisive, systems-oriented, high standards. Transforms complexity into clarity.',
    icon: '⚙️',
  },
  {
    name: 'Nurturing Creative',
    element: 'Water',
    color: '#38bdf8',
    bg: '#0c1929',
    description: 'Empathic, synthesizing, deep thinker. Sees connections others miss.',
    icon: '💧',
  },
  {
    name: 'Steady Achiever',
    element: 'Wood',
    color: '#22c55e',
    bg: '#0a1f0e',
    description: 'Consistent, growth-focused, patient builder. Outlasts everyone.',
    icon: '🌱',
  },
  {
    name: 'Visionary Builder',
    element: 'Fire',
    color: '#f97316',
    bg: '#1f100a',
    description: 'Magnetic, bold, mission-driven. Moves people where others see obstacles.',
    icon: '🔥',
  },
  {
    name: 'Harmonizer Guardian',
    element: 'Earth',
    color: '#d97706',
    bg: '#1f1700',
    description: 'Stabilizing, reliable, community anchor. Holds everything together.',
    icon: '🌍',
  },
]

const steps = [
  {
    number: '1',
    title: 'Enter your birth date',
    description: 'No birth time needed. Just your date of birth to calculate your BaZi chart.',
  },
  {
    number: '2',
    title: 'Answer 5 questions',
    description: 'Short behavioral questions that calibrate your dominant element. Takes 60-90 seconds.',
  },
  {
    number: '3',
    title: 'Get your archetype',
    description: 'Receive your full archetype profile, traits, strategies, tools, and daily briefing.',
  },
]

const miniQA = [
  {
    q: 'Is the quiz really free?',
    a: 'Yes. Your archetype discovery is completely free. No credit card required.',
  },
  {
    q: 'Do I need my birth time?',
    a: 'No. 8os uses birth date plus behavioral questions. Birth time is not required.',
  },
  {
    q: 'How is this different from MBTI or Enneagram?',
    a: 'BaZi elements are timing-aware and goal-integrated. Your archetype comes with seasonal guidance, tool recommendations, and daily nudges, not just a description.',
  },
  {
    q: 'Can I retake the quiz?',
    a: 'Yes, as many times as you want from your account settings.',
  },
]

export default function QuizPage() {
  return (
    <div style={{ background: 'var(--color-bg-primary)', color: 'var(--color-border)' }}>
      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(180deg, #0f0a1e 0%, var(--color-bg-primary) 100%)',
          padding: '80px 24px 64px',
          textAlign: 'center',
          borderBottom: '1px solid var(--color-bg-card)',
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-block',
              background: 'var(--color-accent-soft)',
              color: 'var(--color-text-primary)',
              padding: '7px 18px',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: 700,
              marginBottom: '24px',
              border: '1px solid var(--color-accent-border)',
            }}
          >
            Free · 90 seconds · No birth time needed
          </div>
          <h1
            style={{
              fontSize: '46px',
              fontWeight: 700,
              color: '#FAF7F0',
              lineHeight: 1.15,
              marginBottom: '20px',
            }}
          >
            Discover Your BaZi Archetype
          </h1>
          <p style={{ fontSize: '18px', color: '#E0DAEC', lineHeight: 1.65, marginBottom: '36px' }}>
            Five elements. Five operating systems. The quiz reveals which one is yours, and gives
            you a complete system for goals, productivity, and timing.
          </p>
          <QuizCtaButton
            label="Take the Free Quiz →"
            style={{
              background: 'var(--color-accent)',
              color: '#0d0b14',
              padding: '16px 40px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '17px',
              display: 'inline-block',
            }}
          />
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 24px 120px' }}>
        {/* How it works */}
        <section style={{ marginBottom: '72px' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              textAlign: 'center',
              marginBottom: '40px',
            }}
          >
            How It Works
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
              alignContent: 'start',
            }}
          >
            {steps.map((step) => (
              <div
                key={step.number}
                style={{
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-bg-card)',
                  borderRadius: '12px',
                  padding: '28px 24px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  // Dark charcoal on gold so step number is legible in BOTH themes.
                  // Light theme gold #8A6514 + #0d0b14 = 3.68:1 (AA large-text ≥14pt bold 18.66px ✓)
                  // Dark  theme gold #C79A48 + #0d0b14 = 7.58:1 (AA normal text ✓)
                  style={{
                    width: '44px',
                    height: '44px',
                    background: 'var(--color-accent)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#0d0b14',
                  }}
                >
                  {step.number}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px', textAlign: 'center' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, textAlign: 'center', margin: 0 }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The 5 Archetypes */}
        <section style={{ marginBottom: '72px' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              textAlign: 'center',
              marginBottom: '8px',
            }}
          >
            The 5 Archetypes
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              marginBottom: '36px',
            }}
          >
            Which one will the quiz reveal?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {archetypes.map((a) => (
              <div
                key={a.name}
                style={{
                  background: a.bg,
                  border: `1px solid ${a.color}30`,
                  borderRadius: '12px',
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                }}
              >
                <div style={{ fontSize: '32px', flexShrink: 0 }}>{a.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{a.name}</h3>
                    <span
                      style={{
                        background: `${a.color}20`,
                        color: a.color,
                        padding: '2px 10px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {a.element}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    {a.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mini FAQ */}
        <section style={{ marginBottom: '64px' }}>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: '24px',
            }}
          >
            Quick Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {miniQA.map((qa, i) => (
              <details
                key={i}
                style={{
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-bg-card)',
                  borderRadius: '10px',
                }}
              >
                <summary
                  style={{
                    padding: '18px 24px',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    listStyle: 'none',
                  }}
                >
                  {qa.q}
                </summary>
                <div
                  style={{
                    padding: '0 24px 16px',
                    color: 'var(--color-text-muted)',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    borderTop: '1px solid var(--color-bg-card)',
                    paddingTop: '14px',
                  }}
                >
                  {qa.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <div style={{ textAlign: 'center' }}>
          <QuizCtaButton
            label="Take the Free Archetype Quiz →"
            style={{
              background: 'var(--color-accent)',
              color: '#0d0b14',
              padding: '16px 40px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '17px',
              display: 'inline-block',
            }}
          />
          {/* De-prelaunch: point the secondary quiz CTA at the free archetype reveal. */}
          <div style={{ marginTop: '1.5rem' }}>
            <a
              href="/reveal"
              style={{
                /* OS-5958: --color-accent #8A6514 on cream is only 4.80:1 — axe
                   still flags a[href$='reveal'] as serious. Use accent-hover:
                   light #745612 on #F7F3EC = 6.16:1; dark #A67F30 on #1A1712 = 4.85:1. */
                color: 'var(--color-accent-hover)',
                fontSize: '0.95rem',
                textDecoration: 'none',
                borderBottom: '1px solid color-mix(in srgb, var(--color-accent-hover) 55%, transparent)',
                fontWeight: 600,
              }}
            >
              Take the quiz →
            </a>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '12px' }}>
            Free · No credit card · No birth time needed
          </p>
        </div>
      </div>
    </div>
  )
}
