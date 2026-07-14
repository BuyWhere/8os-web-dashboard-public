import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Why We Don\'t Ask for Your Birth Time | 8os.ai',
  description:
    'Most astrology apps demand your exact birth time. We don\'t, because 80% of the insight comes from your birth date alone. Here\'s why less data gives you more clarity.',
  openGraph: {
    title: 'Why We Don\'t Ask for Your Birth Time',
    description:
      'Birth time is biometrically identifying. We get 80% of the insight from your birth date, no sensitive data required.',
    type: 'article',
    url: 'https://8os.ai/blog/why-no-birth-time',
  },
  alternates: {
    canonical: '/blog/why-no-birth-time',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do I need my exact birth time for astrology?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. 80% of meaningful astrological insight comes from your birth date (year, month, day). Your sun sign captures your core identity; your BaZi Daymaster adds structural depth. Exact birth time (for hour pillar) is an optional upgrade, never required to start.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does birth time affect in astrology?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Birth time determines your Hour Pillar (the fourth pillar in BaZi) and the houses in your Western chart. The Hour Pillar reveals hidden talents and how you present to the world. Houses in Western astrology show which life areas are most prominent. But your Daymaster (from birth day) is the most important factor in goal achievement, and it requires no birth time.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is 8os.ai less accurate without my birth time?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '8os.ai focuses on goal achievement and daily alignment, areas where your Daymaster (birth day) and sun sign are the primary drivers. The hour pillar adds nuance about hidden talents and social presentation, but it\'s not essential for the core experience. You can add birth time later for deeper precision, but it\'s never required.',
      },
    },
  ],
};

export default function WhyNoBirthTimePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article style={articleStyle}>
        <header style={headerStyle}>
          <Link href="/blog" style={backLinkStyle}>← All Articles</Link>
          <h1 style={h1Style}>Why We Don&apos;t Ask for Your Birth Time</h1>
          <p style={metaStyle}>May 7, 2026 · 8os.ai</p>
        </header>

        <div style={contentStyle}>
          <h2 style={h2Style}>The Problem with Precision</h2>
          <p style={pStyle}>Most astrology platforms demand your exact birth time. They say it&apos;s &ldquo;more accurate.&rdquo; But this creates three barriers:</p>

          <h3 style={h3Style}>1. You might not know it</h3>
          <p style={pStyle}>Many people don&apos;t have access to birth certificates with precise times. Some were born before records were digital. Some simply weren&apos;t told.</p>

          <h3 style={h3Style}>2. You might not want to share it</h3>
          <p style={pStyle}>Birth time + location is biometrically identifying. It can be used for identity verification, stalking, or other purposes you didn&apos;t consent to.</p>

          <h3 style={h3Style}>3. It overwhelms before it helps</h3>
          <p style={pStyle}>A full chart with 12 houses and 20 aspects is data paralysis. You get stuck in analysis before you take action.</p>

          <h2 style={h2Style}>Our Philosophy: Start With What You Know</h2>
          <p style={pStyle}>Your sun sign captures your <strong>core identity</strong>, your vitality, your ego, your life force. It&apos;s accurate enough to be meaningful. It&apos;s accessible enough to be shareable. It doesn&apos;t require sensitive data.</p>
          <p style={pStyle}>Then we layer BaZi, which <em>does</em> use your birth date (not time) for Year, Month, and Day pillars. The Day Pillar (your core self) is the most important anyway.</p>

          <h2 style={h2Style}>What You Get Without Birth Time</h2>
          <p style={pStyle}><strong>8os.ai delivers without birth time:</strong></p>
          <ul style={ulStyle}>
            <li>Your unified archetype (Western + BaZi synthesis)</li>
            <li>Your Daymaster and elemental nature</li>
            <li>Your goal achievement style</li>
            <li>Daily briefings aligned to your archetype</li>
            <li>Luck Pillar timing analysis</li>
            <li>Elemental strengths and growth areas</li>
            <li>Goal alignment recommendations</li>
          </ul>
          <p style={pStyle}><strong>What you add with birth time (optional):</strong></p>
          <ul style={ulStyle}>
            <li>Your Hour Pillar (hidden talents)</li>
            <li>Western house placements</li>
            <li>Deeper precision on social presentation</li>
          </ul>

          <h2 style={h2Style}>The Upgrade Path</h2>
          <p style={pStyle}>As you engage with 8os, you can optionally add:</p>
          <ul style={ulStyle}>
            <li><strong>Birth time</strong> → for Hour Pillar depth</li>
            <li><strong>Birth location</strong> → for precise BaZi calculations (latitude affects pillar timing)</li>
            <li><strong>More data</strong> → more precision, but never required</li>
          </ul>
          <p style={pStyle}>The result: <strong>80% of the insight, 0% of the friction.</strong></p>

          <h2 style={h2Style}>Why This Matters for Goals</h2>
          <p style={pStyle}>When you start with accessible data:</p>
          <ol style={olStyle}>
            <li><strong>You act sooner</strong>, No waiting to find your birth certificate</li>
            <li><strong>You share freely</strong>, Tell friends, family, partners about your archetype</li>
            <li><strong>You focus on work that matters</strong>, The insights you have are actionable</li>
            <li><strong>You upgrade when ready</strong>, Add depth as you see value</li>
          </ol>

          <h2 style={h2Style}>The Bottom Line</h2>
          <p style={pStyle}>Astrology should illuminate, not intimidate. It should help you act, not paralyze you with complexity.</p>
          <p style={pStyle}><strong>Start today. Start with what you know.</strong></p>

          <div style={ctaBoxStyle}>
            <p style={ctaTextStyle}>Get your archetype with just your birth date.</p>
            <Link href="/onboarding" style={ctaButtonStyle}>Get Your Free Archetype →</Link>
          </div>
        </div>
      </article>
    </>
  );
}

const articleStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '4rem 2rem',
  background: '#060608',
  color: 'var(--color-bg-secondary)',
  minHeight: '100vh',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '3rem',
  paddingBottom: '2rem',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
};

const backLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '1.5rem',
  color: '#a78bfa',
  textDecoration: 'none',
  fontSize: '0.9rem',
};

const h1Style: React.CSSProperties = {
  margin: '0 0 1rem',
  fontSize: 'clamp(2rem, 5vw, 3rem)',
  lineHeight: 1.15,
  letterSpacing: '-0.03em',
  fontWeight: 800,
};

const metaStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.9rem',
  color: 'rgba(248,250,252,0.5)',
};

const contentStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  lineHeight: 1.8,
};

const h2Style: React.CSSProperties = {
  margin: '2.5rem 0 1rem',
  fontSize: '1.5rem',
  letterSpacing: '-0.02em',
  color: 'var(--color-bg-secondary)',
};

const h3Style: React.CSSProperties = {
  margin: '1.5rem 0 0.75rem',
  fontSize: '1.15rem',
  color: '#a78bfa',
};

const pStyle: React.CSSProperties = {
  margin: '0 0 1.25rem',
  color: 'rgba(248,250,252,0.8)',
};

const ulStyle: React.CSSProperties = {
  margin: '0 0 1.5rem',
  paddingLeft: '1.5rem',
  color: 'rgba(248,250,252,0.8)',
};

const olStyle: React.CSSProperties = {
  margin: '0 0 1.5rem',
  paddingLeft: '1.5rem',
  color: 'rgba(248,250,252,0.8)',
};

const ctaBoxStyle: React.CSSProperties = {
  margin: '3rem 0',
  padding: '2rem',
  borderRadius: '16px',
  background: 'rgba(124,58,237,0.1)',
  border: '1px solid rgba(124,58,237,0.3)',
  textAlign: 'center',
};

const ctaTextStyle: React.CSSProperties = {
  margin: '0 0 1.25rem',
  fontSize: '1rem',
  color: 'rgba(248,250,252,0.8)',
};

const ctaButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.9rem 1.75rem',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
  color: '#fff',
  fontWeight: 700,
  textDecoration: 'none',
  fontSize: '1rem',
  boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
};