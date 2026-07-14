import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '8os Philosophy, You Are On a Path. You Control the Journey.',
  description:
    'Agency over fate, happiness through authentic achievement, and the two-languages hypothesis. The core philosophy behind 8os.ai.',
};

export default function PhilosophyPage() {
  return (
    <div style={pageStyle}>
      <div style={innerStyle}>
        <div style={headerStyle}>
          <p style={eyebrowStyle}>Philosophy</p>
          <h1 style={pageTitleStyle}>You Are On a Path. You Control the Journey.</h1>
        </div>

        {/* Thesis 1: Agency Over Fate */}
        <section style={thesisStyle}>
          <div style={thesisNumberStyle}>01</div>
          <h2 style={thesisTitleStyle}>Agency Over Fate</h2>
          <p style={thesisLeadStyle}>
            This is not about whether you are lucky or unlucky. You are on a given path, your archetype, your
            structure, your tendencies. <strong>But you control the journey and the destination.</strong> Your star sign
            and BaZi don&apos;t dictate outcomes. They dictate <em>how</em> and <em>when</em>.
          </p>
          <p style={thesisBodyStyle}>
            A Capricorn-庚 Metal isn&apos;t &ldquo;fated&rdquo; to be a CEO. But they&apos;re <em>built</em> to build
            systems, endure pressure, and lead through structure. They can apply that to art, to parenting, to community
            organizing, to any goal they choose. The path is theirs. The <em>how</em> is written in the stars. The{' '}
            <em>what</em> is written by them.
          </p>
          <blockquote style={quoteStyle}>
            &ldquo;It&apos;s not a question of whether you are lucky or unlucky. You are on a given path and you control
            the journey and the destiny no matter what your star sign says. It is just a question of how and when.&rdquo;
          </blockquote>
        </section>

        <div style={dividerStyle} />

        {/* Thesis 2: Happiness */}
        <section style={thesisStyle}>
          <div style={thesisNumberStyle}>02</div>
          <h2 style={thesisTitleStyle}>Happiness Through Authentic Achievement</h2>
          <p style={thesisLeadStyle}>
            We reject the hustle culture that says &ldquo;suffer now, succeed later.&rdquo; We reject the spiritual
            bypass that says &ldquo;just accept everything.&rdquo;
          </p>
          <p style={thesisBodyStyle}>
            Our position:{' '}
            <strong>Push yourself to achieve what matters to you, in the way that suits you, so it makes you happy.</strong>
          </p>
          <div style={examplesGridStyle}>
            {HAPPINESS_EXAMPLES.map(({ archetype, method }) => (
              <div key={archetype} style={exampleCardStyle}>
                <p style={exampleArchetypeStyle}>{archetype}</p>
                <p style={exampleMethodStyle}>{method}</p>
              </div>
            ))}
          </div>
          <p style={thesisBodyStyle}>
            8os.ai doesn&apos;t just track your goals. It tracks whether your <em>method</em> aligns with your{' '}
            <em>nature</em>, because success that feels wrong isn&apos;t success.
          </p>
        </section>

        <div style={dividerStyle} />

        {/* Thesis 3: Two Languages */}
        <section style={thesisStyle}>
          <div style={thesisNumberStyle}>03</div>
          <h2 style={thesisTitleStyle}>The Two-Languages Hypothesis</h2>
          <p style={thesisLeadStyle}>
            Personality isn&apos;t culture-specific. The stars don&apos;t care if you&apos;re reading them through Greek
            houses or Chinese pillars.
          </p>
          <div style={twoColStyle}>
            <div style={langCardStyle}>
              <p style={langLabelStyle}>Western Astrology</p>
              <p style={langRoleStyle}>The Weather</p>
              <p style={langDescStyle}>
                The daily, monthly, seasonal expressions of your character. What&apos;s active, what&apos;s foreground,
                what energy is available right now.
              </p>
            </div>
            <div style={langCardStyle}>
              <p style={langLabelStyle}>BaZi (八字)</p>
              <p style={langRoleStyle}>The Climate</p>
              <p style={langDescStyle}>
                The structural tendencies, the long arcs, the deep patterns that persist across decades. Your operating
                system at the kernel level.
              </p>
            </div>
          </div>
          <p style={thesisBodyStyle}>
            You need both to dress for life. But we start with what you know: your sun sign. Because the journey to
            self-knowledge begins with a single step, not a data dump.
          </p>
        </section>

        <div style={dividerStyle} />

        {/* How 8os supports agency */}
        <section style={thesisStyle}>
          <h2 style={thesisTitleStyle}>How 8os.ai Supports Agency</h2>
          <div style={agencyListStyle}>
            {AGENCY_POINTS.map(({ label, body }) => (
              <div key={label} style={agencyItemStyle}>
                <p style={agencyLabelStyle}>{label}</p>
                <p style={agencyBodyStyle}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={ctaSectionStyle}>
          <p style={ctaLabelStyle}>Start your journey</p>
          <h2 style={ctaTitleStyle}>Live your path. On your terms.</h2>
          <div style={ctaGroupStyle}>
            <Link href="/onboarding" style={primaryCtaStyle}>
              Get Your Free Archetype →
            </Link>
            <Link href="/methodology" style={secondaryCtaStyle}>
              How We Calculate It
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

const HAPPINESS_EXAMPLES = [
  {
    archetype: '丙 Fire Daymaster',
    method: 'Thrives on visibility and passion. Their "push" looks like public commitment, creative sprints, and recognition.',
  },
  {
    archetype: '戊 Earth Daymaster',
    method: 'Thrives on stability and incremental progress. Their "push" looks like routine, patience, and compound growth.',
  },
];

const AGENCY_POINTS = [
  {
    label: 'No deterministic predictions',
    body: 'We don\'t say "you will get married in 2027." We say "your relationship pillar is active in 2027, optimal for commitment if you choose it."',
  },
  {
    label: 'Goal-native architecture',
    body: 'You define success. We optimize the path. Your archetype is a map, not a destiny.',
  },
  {
    label: 'Journal reflection',
    body: '"You mentioned feeling \'trapped\' 5x this week. Your path values freedom. Is your current goal actually yours?"',
  },
  {
    label: 'Timing, not fate',
    body: '"Launch now or wait?" → "Your timing supports launches in Q3. But the decision is yours."',
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
  fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
  lineHeight: 1.1,
  letterSpacing: '-0.04em',
};

const thesisStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  marginBottom: '1rem',
};

const thesisNumberStyle: React.CSSProperties = {
  fontSize: '3rem',
  fontWeight: 900,
  letterSpacing: '-0.06em',
  color: 'rgba(167, 139, 250, 0.2)',
  lineHeight: 1,
  marginBottom: '-0.5rem',
};

const thesisTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
  letterSpacing: '-0.03em',
  color: 'var(--color-text-primary)',
};

const thesisLeadStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.1rem',
  lineHeight: 1.7,
  color: 'var(--color-text-secondary)',
};

const thesisBodyStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  lineHeight: 1.75,
  color: 'var(--color-text-secondary)',
};

const quoteStyle: React.CSSProperties = {
  margin: 0,
  padding: '1.25rem 1.5rem',
  borderLeft: '3px solid var(--color-accent)',
  fontSize: '1.05rem',
  lineHeight: 1.65,
  fontStyle: 'italic',
  color: 'var(--color-text-primary)',
  background: 'var(--color-accent-soft)',
  borderRadius: '0 12px 12px 0',
};

const dividerStyle: React.CSSProperties = {
  height: '1px',
  background: 'var(--color-border)',
  margin: '3rem 0',
};

const examplesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1rem',
};

const exampleCardStyle: React.CSSProperties = {
  padding: '1.5rem',
  borderRadius: '14px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
};

const exampleArchetypeStyle: React.CSSProperties = {
  margin: '0 0 0.5rem',
  fontSize: '0.85rem',
  fontWeight: 700,
  color: 'var(--color-accent)',
};

const exampleMethodStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.9rem',
  lineHeight: 1.65,
  color: 'var(--color-text-secondary)',
};

const twoColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '1.25rem',
};

const langCardStyle: React.CSSProperties = {
  padding: '1.75rem',
  borderRadius: '16px',
  border: '1px solid rgba(167, 139, 250, 0.2)',
  background: 'var(--color-accent-soft)',
};

const langLabelStyle: React.CSSProperties = {
  margin: '0 0 0.25rem',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--color-accent)',
};

const langRoleStyle: React.CSSProperties = {
  margin: '0 0 0.75rem',
  fontSize: '1.4rem',
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: 'var(--color-text-primary)',
};

const langDescStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.9rem',
  lineHeight: 1.7,
  color: 'var(--color-text-secondary)',
};

const agencyListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
  border: '1px solid var(--color-border)',
  borderRadius: '16px',
  overflow: 'hidden',
};

const agencyItemStyle: React.CSSProperties = {
  padding: '1.5rem',
  borderBottom: '1px solid var(--color-border)',
};

const agencyLabelStyle: React.CSSProperties = {
  margin: '0 0 0.4rem',
  fontSize: '0.88rem',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
};

const agencyBodyStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.9rem',
  lineHeight: 1.65,
  color: 'var(--color-text-secondary)',
  fontStyle: 'italic',
};

const ctaSectionStyle: React.CSSProperties = {
  marginTop: '4rem',
  paddingTop: '3rem',
  borderTop: '1px solid var(--color-border)',
};

const ctaLabelStyle: React.CSSProperties = {
  margin: '0 0 0.5rem',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-accent)',
};

const ctaTitleStyle: React.CSSProperties = {
  margin: '0 0 1.5rem',
  fontSize: '1.75rem',
  letterSpacing: '-0.03em',
};

const ctaGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
  alignItems: 'center',
};

const primaryCtaStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.85rem 1.75rem',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent) 100%)',
  color: '#fff',
  fontWeight: 700,
  textDecoration: 'none',
  boxShadow: '0 8px 24px var(--color-accent-soft)',
};

const secondaryCtaStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '0.95rem',
  color: 'var(--color-text-secondary)',
  textDecoration: 'none',
};
