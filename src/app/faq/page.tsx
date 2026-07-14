import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ — 8os.ai',
  description:
    'Frequently asked questions about 8os.ai, BaZi, the Five Elements, archetypes, and how the platform works.',
  keywords: ['8os faq', 'BaZi questions', 'archetype quiz faq', 'five elements faq'],
}

const faqs = [
  {
    section: 'About 8os',
    questions: [
      {
        q: 'What is 8os.ai?',
        a: '8os.ai is a personal operating system built on BaZi (Chinese metaphysics) and Western astrology. It reveals your dominant element — Metal, Water, Wood, Fire, or Earth — and translates that into a practical system for goal-setting, productivity, timing, and daily decision-making. Think of it as the operating system your personality has always needed.',
      },
      {
        q: 'Is 8os free?',
        a: 'Yes. Your archetype discovery is completely free. You can discover your BaZi element, get your archetype profile, and access your daily briefing at no cost. Premium features like team compatibility, goal tracking, and API access are available on paid plans.',
      },
      {
        q: 'Does 8os require my birth time?',
        a: "No. Most traditional BaZi systems require an exact birth time to calculate the hour pillar. 8os uses a different methodology — birth date plus five behavioral questions — because birth time data is unreliable for over 70% of people. Our approach is more accessible and equally actionable.",
      },
      {
        q: 'Is my data private?',
        a: 'Yes. Your personal data is encrypted in transit (TLS 1.3) and at rest (AES-256). We never sell or share your data with third parties. You can export or delete your data at any time from your account settings.',
      },
    ],
  },
  {
    section: 'BaZi & The Five Elements',
    questions: [
      {
        q: 'What is BaZi?',
        a: 'BaZi (八字, "Eight Characters") is a Chinese metaphysical system that analyzes a person\'s birth date to determine their dominant elemental energy: Metal, Water, Wood, Fire, or Earth. Each element corresponds to a distinct operating style — how you make decisions, manage energy, relate to others, and pursue goals. BaZi is less about fate and more about understanding your natural operating conditions.',
      },
      {
        q: 'What is the Five Elements system?',
        a: 'The Five Elements (五行, Wu Xing) are Metal, Water, Wood, Fire, and Earth. In BaZi, they represent five fundamental operating modes. Metal is precise and systems-oriented. Water is adaptive and synthesizing. Wood is growth-focused and consistent. Fire is magnetic and vision-driven. Earth is stabilizing and community-oriented. Each person has a dominant element that shapes how they work best.',
      },
      {
        q: 'How is BaZi different from Myers-Briggs?',
        a: "MBTI describes personality traits in a static snapshot. BaZi does two additional things: it incorporates timing (seasonal energy cycles that affect when you perform best) and it integrates directly with goal-setting and daily practice. Research also shows that MBTI type descriptions change for roughly 50% of people after five weeks — BaZi elements don't change, because they're based on birth date, not self-reported questionnaires.",
      },
    ],
  },
  {
    section: 'Archetypes & Quiz',
    questions: [
      {
        q: 'What is my archetype?',
        a: 'Your archetype is your dominant BaZi element expressed as a practical identity: Strategic Commander (Metal), Nurturing Creative (Water), Steady Achiever (Wood), Visionary Builder (Fire), or Harmonizer Guardian (Earth). Each archetype comes with a complete operating profile — strengths, challenges, best tools, timing windows, and daily nudges.',
      },
      {
        q: 'What are the 5 archetypes?',
        a: 'Strategic Commander (Metal): decisive, systems-oriented, high standards. Nurturing Creative (Water): empathic, synthesizing, deep thinker. Steady Achiever (Wood): consistent, growth-focused, patient builder. Visionary Builder (Fire): magnetic, bold, mission-driven. Harmonizer Guardian (Earth): stabilizing, reliable, community anchor. Each archetype has distinct goal-setting strategies, productivity patterns, and timing cycles.',
      },
      {
        q: 'How does the archetype quiz work?',
        a: 'The quiz takes approximately 90 seconds. You enter your birth date, then answer five behavioral questions that calibrate your dominant element. No birth time is required. The result is your archetype — a complete operating profile you can immediately apply to your goals and daily routine.',
      },
    ],
  },
  {
    section: 'Features & Tools',
    questions: [
      {
        q: 'Can I use 8os with my existing tools?',
        a: 'Yes. 8os is designed to complement your existing productivity stack — Notion, Todoist, Obsidian, Google Calendar, and more. Your archetype profile includes tool recommendations matched to your element. Premium users can connect 8os to external tools via the API.',
      },
      {
        q: 'What is the daily briefing?',
        a: 'The daily briefing is a short, archetype-specific summary generated each morning. It includes your focus theme for the day, your core strength to activate, a behavioral nudge matched to your element, and your energy forecast. It takes 60 seconds to read and is designed to orient your day around how you actually operate.',
      },
      {
        q: 'How do I share my archetype?',
        a: 'Every archetype has a dedicated share card at 8os.ai/share/[archetype-slug]. For example, Strategic Commanders share at /share/strategic-commander. Each card includes your archetype name, element, tagline, traits, and a CTA for others to discover their own archetype.',
      },
      {
        q: 'Can businesses use 8os?',
        a: 'Yes. 8os for Teams provides team compatibility analysis, aggregate element distribution, and shared goal frameworks. Businesses can also access the 8os API to integrate archetype data into their own applications. Contact us for enterprise pricing.',
      },
    ],
  },
  {
    section: 'Astrology & Other Systems',
    questions: [
      {
        q: 'How is 8os different from astrology?',
        a: "Western astrology gives you a personality sketch based on your sun sign. 8os goes further: it uses BaZi's elemental system to create a timing-aware operating system. The key differences are that 8os provides (1) actionable daily guidance, (2) timing windows for major decisions, (3) goal frameworks matched to your element, and (4) integration with productivity tools — not just a personality description.",
      },
      {
        q: 'What if I disagree with my archetype?',
        a: 'You can retake the quiz at any time from your account settings. If you still feel the result doesn\'t fit, reach out to our support team — we can help you calibrate based on additional questions. Note that it\'s common for people to initially identify with a different archetype than their actual dominant element, especially if they\'ve spent years adapting to environments that reward other elements.',
      },
    ],
  },
]

const allQA = faqs.flatMap((s) => s.questions)

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: allQA.map((qa) => ({
    '@type': 'Question',
    name: qa.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: qa.a,
    },
  })),
}

export default function FAQPage() {
  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: 'var(--color-border)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 700, color: 'var(--color-bg-secondary)', marginBottom: '12px' }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>
            Everything you need to know about 8os.ai, BaZi, and your archetype.
          </p>
        </div>

        {/* FAQ Sections */}
        {faqs.map((section) => (
          <div key={section.section} style={{ marginBottom: '48px' }}>
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#7c3aed',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '20px',
              }}
            >
              {section.section}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {section.questions.map((qa, i) => (
                <details
                  key={i}
                  style={{
                    background: '#0f0f0f',
                    border: '1px solid #1e1e2e',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <summary
                    style={{
                      padding: '20px 24px',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: 'var(--color-bg-secondary)',
                      cursor: 'pointer',
                      listStyle: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    {qa.q}
                    <span style={{ color: '#7c3aed', fontSize: '20px', marginLeft: '12px' }}>+</span>
                  </summary>
                  <div
                    style={{
                      padding: '0 24px 20px',
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.75,
                      fontSize: '15px',
                      borderTop: '1px solid #1e1e2e',
                      paddingTop: '16px',
                    }}
                  >
                    {qa.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}

        {/* CTA */}
        <div
          style={{
            marginTop: '48px',
            textAlign: 'center',
            background: '#0f0f1a',
            border: '1px solid #1e1b4b',
            borderRadius: '16px',
            padding: '40px',
          }}
        >
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '12px' }}>
            Still have questions?
          </h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
            The fastest way to understand 8os is to try it. Discover your archetype free in 90 seconds.
          </p>
          <Link
            href="/onboarding"
            style={{
              background: '#7c3aed',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '15px',
              display: 'inline-block',
            }}
          >
            Get Your Archetype Free →
          </Link>
        </div>
      </div>
    </div>
  )
}
