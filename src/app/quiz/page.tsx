import Link from 'next/link'
import type { Metadata } from 'next'
import { QuizCtaButton } from '@/components/QuizCtaButton'

export const metadata: Metadata = {
  title: 'BaZi Archetype Quiz — Discover Your Element | 8os.ai',
  description:
    'Take the free 8os archetype quiz. Discover your BaZi element — Metal, Water, Wood, Fire, or Earth — and get your personal operating system in 90 seconds.',
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
    title: 'BaZi Archetype Quiz — Discover Your Element | 8os.ai',
    description:
      'Take the free 8os archetype quiz. Discover your BaZi element — Metal, Water, Wood, Fire, or Earth — and get your personal operating system in 90 seconds.',
    url: 'https://8os.ai/quiz',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaZi Archetype Quiz — Discover Your Element | 8os.ai',
    description:
      'Take the free 8os archetype quiz. Discover your BaZi element — Metal, Water, Wood, Fire, or Earth — and get your personal operating system in 90 seconds.',
  },
}

const archetypes = [
  {
    name: 'Strategic Commander',
    element: 'Metal',
    color: '#94a3b8',
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
    description: 'Short behavioral questions that calibrate your dominant element. Takes 60–90 seconds.',
  },
  {
    number: '3',
    title: 'Get your archetype',
    description: 'Receive your full archetype profile — traits, strategies, tools, and daily briefing.',
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
    a: 'BaZi elements are timing-aware and goal-integrated. Your archetype comes with seasonal guidance, tool recommendations, and daily nudges — not just a description.',
  },
  {
    q: 'Can I retake the quiz?',
    a: 'Yes, as many times as you want from your account settings.',
  },
]

export default function QuizPage() {
  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: '#e2e8f0' }}>
      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(180deg, #0f0a1e 0%, #080808 100%)',
          padding: '80px 24px 64px',
          textAlign: 'center',
          borderBottom: '1px solid #1e1b4b',
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-block',
              background: '#1e1b4b',
              color: '#a5b4fc',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '24px',
            }}
          >
            Free · 90 seconds · No birth time needed
          </div>
          <h1
            style={{
              fontSize: '46px',
              fontWeight: 700,
              color: '#f1f5f9',
              lineHeight: 1.15,
              marginBottom: '20px',
            }}
          >
            Discover Your BaZi Archetype
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.65, marginBottom: '36px' }}>
            Five elements. Five operating systems. The quiz reveals which one is yours — and gives
            you a complete system for goals, productivity, and timing.
          </p>
          <QuizCtaButton
            label="Take the Free Quiz →"
            style={{
              background: '#7c3aed',
              color: '#fff',
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

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 24px' }}>
        {/* How it works */}
        <section style={{ marginBottom: '72px' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#f1f5f9',
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
            }}
          >
            {steps.map((step) => (
              <div
                key={step.number}
                style={{
                  background: '#0f0f0f',
                  border: '1px solid #1e1e2e',
                  borderRadius: '12px',
                  padding: '28px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    background: '#7c3aed',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {step.number}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '8px' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
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
              color: '#f1f5f9',
              textAlign: 'center',
              marginBottom: '8px',
            }}
          >
            The 5 Archetypes
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: '#94a3b8',
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
                    <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#f1f5f9' }}>{a.name}</h3>
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
                  <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.5 }}>
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
              color: '#f1f5f9',
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
                  background: '#0f0f0f',
                  border: '1px solid #1e1e2e',
                  borderRadius: '10px',
                }}
              >
                <summary
                  style={{
                    padding: '18px 24px',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#f1f5f9',
                    cursor: 'pointer',
                    listStyle: 'none',
                  }}
                >
                  {qa.q}
                </summary>
                <div
                  style={{
                    padding: '0 24px 16px',
                    color: '#94a3b8',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    borderTop: '1px solid #1e1e2e',
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
              background: '#7c3aed',
              color: '#fff',
              padding: '16px 40px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '17px',
              display: 'inline-block',
            }}
          />
          {/* OS-1173: prelaunch /coming-soon cross-link on the quiz page. */}
          <div style={{ marginTop: '1.5rem' }}>
            <a
              href="/coming-soon"
              style={{
                color: '#c4b5fd',
                fontSize: '0.95rem',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(196, 181, 253, 0.3)',
              }}
            >
              Not ready? Reserve your spot for the July 7 launch →
            </a>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '12px' }}>
            Free · No credit card · No birth time needed
          </p>
        </div>
      </div>
    </div>
  )
}
