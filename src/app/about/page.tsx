import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About 8os, Why We Built the Bridge',
  description:
    'The origin story of 8os.ai, why we built a live operating system that bridges Western astrology and BaZi to help you become your best self.',
};

export default function AboutPage() {
  return (
    <div style={pageStyle}>
      <div style={innerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <p style={eyebrowStyle}>About 8os</p>
          <h1 style={pageTitleStyle}>Why We Built the Bridge</h1>
        </div>

        {/* Origin story */}
        <section style={sectionStyle}>
          <div style={proseStyle}>
            <p style={leadStyle}>
              It started with a simple observation: everyone knows their star sign. Almost no one knows their BaZi. Yet
              both systems describe the same person, just through different lenses.
            </p>

            <p style={bodyStyle}>
              Our founder, a Capricorn and 庚 Metal Daymaster, spent years watching Western astrology hook people with
              accessible sun-sign content, only to leave them hungry for more. Meanwhile, BaZi, with its extraordinary
              precision for timing, career fit, and life structure, remained locked behind language barriers, cultural
              distance, and the requirement for exact birth times.
            </p>

            <p style={bodyStyle}>But the real gap wasn&apos;t intellectual. It was <strong>purpose</strong>.</p>

            <p style={bodyStyle}>
              Most astrology platforms tell you <em>who you are</em>. They don&apos;t help you{' '}
              <em>become who you want to be</em>. They don&apos;t connect your cosmic pattern to your Monday morning
              goals. They don&apos;t integrate with the apps you actually use. They don&apos;t journal with you, reflect
              with you, or push you when you need pushing.
            </p>

            <p style={highlightStyle}>8os.ai is that bridge, and that push.</p>

            <p style={bodyStyle}>
              We believe your birth data isn&apos;t a destiny sentence. It&apos;s an <strong>operating manual</strong>.
              It shows you <em>how</em> you&apos;re built to achieve, <em>when</em> you&apos;re built to push, and{' '}
              <em>what</em> kind of success will actually make you happy. Not someone else&apos;s version of success.
              Yours.
            </p>

            {/* Mid-story conversion CTA — OS-6554 */}
            <div style={midCtaWrapStyle}>
              <Link href="/signup" style={primaryLinkStyle}>
                Try it free
              </Link>
              <span style={midCtaHintStyle}>Free. No credit card. Works in your browser.</span>
            </div>
          </div>
        </section>

        {/* Core beliefs */}
        <section style={beliefsSection}>
          <h2 style={h2Style}>What We Believe</h2>
          <div style={beliefsGridStyle}>
            {BELIEFS.map(({ title, body }) => (
              <div key={title} style={beliefCardStyle}>
                <h3 style={beliefTitleStyle}>{title}</h3>
                <p style={beliefBodyStyle}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={ctaSectionStyle}>
          <h2 style={ctaTitleStyle}>Ready to find your operating manual?</h2>
          <div style={ctaLinksStyle}>
            <Link href="/signup" style={primaryLinkStyle}>
              Try it free
            </Link>
            <Link href="/onboarding" style={secondaryLinkStyle}>
              Get your free archetype →
            </Link>
            <Link href="/philosophy" style={secondaryLinkStyle}>
              Read our philosophy
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

const BELIEFS = [
  {
    title: 'Your path is yours to own',
    body: 'The stars don\'t dictate outcomes, they reveal tendencies. You control the destination. The chart just shows you how you\'re built to travel.',
  },
  {
    title: 'Self-knowledge is the best productivity tool',
    body: 'Working with your nature instead of against it isn\'t woo, it\'s efficiency. Understanding your optimal timing, decision style, and energy patterns compounds every other effort.',
  },
  {
    title: 'Achievement should feel like you',
    body: 'Success that comes at the cost of your happiness isn\'t success. We\'re building systems that optimize for both, because they\'re not actually in conflict.',
  },
  {
    title: 'Ancient wisdom + modern systems',
    body: 'BaZi is 1,500 years old. AI is months old. The combination is new. But both are tools in service of the same goal: helping you understand yourself and operate at your best.',
  },
];

const pageStyle: React.CSSProperties = {
  background: 'var(--color-bg-primary)',
  color: 'var(--color-text-primary)',
  minHeight: '100vh',
};

const innerStyle: React.CSSProperties = {
  maxWidth: '800px',
  margin: '0 auto',
  padding: '5rem 2rem',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '4rem',
};

const eyebrowStyle: React.CSSProperties = {
  margin: '0 0 0.75rem',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-accent)',
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'clamp(2.4rem, 5vw, 3.5rem)',
  lineHeight: 1.1,
  letterSpacing: '-0.04em',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '4rem',
};

const proseStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const leadStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.2rem',
  lineHeight: 1.7,
  color: 'var(--color-text-secondary)',
  fontWeight: 500,
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.05rem',
  lineHeight: 1.75,
  color: 'var(--color-text-secondary)',
};

const highlightStyle: React.CSSProperties = {
  margin: 0,
  padding: '1.25rem 1.5rem',
  borderLeft: '3px solid var(--color-accent)',
  fontSize: '1.15rem',
  fontStyle: 'italic',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  background: 'var(--color-accent-soft)',
  borderRadius: '0 12px 12px 0',
};

const beliefsSection: React.CSSProperties = {
  marginBottom: '4rem',
  paddingTop: '3rem',
  borderTop: '1px solid var(--color-border)',
};

const h2Style: React.CSSProperties = {
  margin: '0 0 2rem',
  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
  letterSpacing: '-0.03em',
};

const beliefsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.25rem',
};

const beliefCardStyle: React.CSSProperties = {
  padding: '1.75rem',
  borderRadius: '16px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
};

const beliefTitleStyle: React.CSSProperties = {
  margin: '0 0 0.75rem',
  fontSize: '1rem',
  fontWeight: 700,
};

const beliefBodyStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.92rem',
  lineHeight: 1.7,
  color: 'var(--color-text-secondary)',
};

const ctaSectionStyle: React.CSSProperties = {
  paddingTop: '3rem',
  borderTop: '1px solid var(--color-border)',
};

const ctaTitleStyle: React.CSSProperties = {
  margin: '0 0 1.5rem',
  fontSize: '1.75rem',
  letterSpacing: '-0.03em',
};

const midCtaWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '1rem',
  marginTop: '0.5rem',
};

const midCtaHintStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  color: 'var(--color-text-secondary)',
};

const ctaLinksStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
  alignItems: 'center',
};

const primaryLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.85rem 1.75rem',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent) 100%)',
  color: '#fff',
  fontWeight: 700,
  textDecoration: 'none',
  boxShadow: '0 8px 24px var(--color-accent-soft)',
};

const secondaryLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '0.95rem',
  color: 'var(--color-text-secondary)',
  textDecoration: 'none',
};
