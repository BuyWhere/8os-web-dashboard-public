import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'What Is BaZi and How Can It Help You Achieve Your Goals? | 8os.ai',
  description:
    'BaZi (Four Pillars of Destiny) reveals your operating system from your birth data. Learn how this Chinese metaphysical system helps you understand your optimal path to achieving your best self.',
  openGraph: {
    title: 'What Is BaZi? The Operating System for Your Best Self',
    description:
      "BaZi doesn't predict your fate, it reveals your optimal operating system. Here's how to use it for goal achievement.",
    type: 'article',
    url: 'https://8os.ai/blog/what-is-bazi-best-self',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'What Is BaZi' }],
  },
  alternates: {
    canonical: '/blog/what-is-bazi-best-self',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'What Is BaZi and How Can It Help You Achieve Your Goals?',
  description:
    'BaZi (Four Pillars of Destiny) reveals your operating system from your birth data. Learn how this Chinese metaphysical system helps you understand your optimal path.',
  author: { '@type': 'Organization', name: '8os.ai' },
  publisher: { '@type': 'Organization', name: '8os.ai', url: 'https://8os.ai' },
  datePublished: '2026-05-07',
  dateModified: '2026-05-07',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://8os.ai/blog/what-is-bazi-best-self' },
};

export default function WhatIsBaziPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article style={articleStyle}>
        <header style={headerStyle}>
          <Link href="/blog" style={backLinkStyle}>← All Articles</Link>
          <h1 style={h1Style}>What Is BaZi and How Can It Help You Achieve Your Goals?</h1>
          <p style={metaStyle}>May 7, 2026 · 8os.ai</p>
        </header>

        <div style={contentStyle}>
          <p style={leadStyle}>
            You already know your star sign. Here&apos;s the system that knows your <em>structure</em>, and how to use it to become who you want to be.
          </p>

          <h2 style={h2Style}>What Is BaZi?</h2>
          <p style={pStyle}>
            BaZi (八字), literally &ldquo;Eight Characters&rdquo;, is a Chinese metaphysical system that reads your life patterns from your birth data. Four pillars, eight characters, unique to your exact birth moment.
          </p>
          <p style={pStyle}>
            But here&apos;s what matters: <strong>BaZi doesn&apos;t predict your fate. It reveals your optimal operating system.</strong>
          </p>

          <h2 style={h2Style}>The Four Pillars</h2>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Pillar</th>
                  <th style={thStyle}>Derived From</th>
                  <th style={thStyle}>Represents</th>
                  <th style={thStyle}>For Your Goals</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Year Pillar</td>
                  <td style={tdStyle}>Birth year</td>
                  <td style={tdStyle}>Roots, heritage</td>
                  <td style={tdStyle}>Where you come from</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Month Pillar</td>
                  <td style={tdStyle}>Birth month</td>
                  <td style={tdStyle}>Career DNA</td>
                  <td style={tdStyle}>How you work best</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Day Pillar</td>
                  <td style={tdStyle}>Birth day</td>
                  <td style={tdStyle}>Daymaster (You)</td>
                  <td style={tdStyle}>Your core strategy</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Hour Pillar</td>
                  <td style={tdStyle}>Birth hour</td>
                  <td style={tdStyle}>Hidden talents</td>
                  <td style={tdStyle}>What you haven&apos;t tapped</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 style={h2Style}>Why It Works for Goal Achievement</h2>
          <p style={pStyle}>
            BaZi measures time through astronomical cycles, Jupiter&apos;s 12-year orbit, Saturn&apos;s 30-year cycle.
          </p>
          <p style={pStyle}>
            When you were born, specific elemental forces were dominant. Those forces don&apos;t predict your future. They reveal <strong>how you&apos;re built to push, when you&apos;re built to rest, and what kind of achievement will actually satisfy you.</strong>
          </p>
          <p style={pStyle}>
            A 庚 Metal Daymaster pushing for a goal through chaos and improvisation? Misery. Through structure and incremental authority? Exhilaration.
          </p>

          <h2 style={h2Style}>The Five Elements in BaZi</h2>
          <p style={pStyle}>The Five Elements (Wu Xing) are the energetic forces that flow through your BaZi chart:</p>
          <ul style={ulStyle}>
            <li><strong>Wood (甲, 乙)</strong>, Growth, expansion, flexibility</li>
            <li><strong>Fire (丙, 丁)</strong>, Energy, visibility, transformation</li>
            <li><strong>Earth (戊, 己)</strong>, Stability, nourishment, structure</li>
            <li><strong>Metal (庚, 辛)</strong>, Precision, authority, clarity</li>
            <li><strong>Water (壬, 癸)</strong>, Flow, intuition, depth</li>
          </ul>
          <p style={pStyle}>
            Your Daymaster, the element tied to your Day Pillar, is your core self. It determines how you approach goals, work, relationships, and success.
          </p>

          <h2 style={h2Style}>BaZi vs. Western Astrology</h2>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Aspect</th>
                  <th style={thStyle}>Western Astrology</th>
                  <th style={thStyle}>BaZi</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Core data</td>
                  <td style={tdStyle}>Birth date + time</td>
                  <td style={tdStyle}>Birth date (year, month, day)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Time cycles</td>
                  <td style={tdStyle}>Planetary transits</td>
                  <td style={tdStyle}>Luck Pillars (10-year cycles)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Focus</td>
                  <td style={tdStyle}>Psychological, relational</td>
                  <td style={tdStyle}>Structural, goal-native</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Birth time required</td>
                  <td style={tdStyle}>Yes (for full chart)</td>
                  <td style={tdStyle}>No (for core analysis)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Goal optimization</td>
                  <td style={tdStyle}>Indirect</td>
                  <td style={tdStyle}>Direct</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={pStyle}>
            Western astrology tells you <em>who you are</em>. BaZi tells you <em>how you operate</em>, and when your operating system is best supported by cosmic weather.
          </p>

          <h2 style={h2Style}>The 8os Synthesis</h2>
          <p style={pStyle}>At 8os.ai, we don&apos;t make you choose. We synthesize your Western zodiac with your BaZi Daymaster into a unified archetype that:</p>
          <ul style={ulStyle}>
            <li>Understands your <strong>core motivation</strong> (sun sign + Daymaster)</li>
            <li>Maps your <strong>goal achievement style</strong> (element interactions)</li>
            <li>Identifies your <strong>optimal timing windows</strong> (Luck Pillars)</li>
            <li>Aligns daily action with <strong>cosmic support</strong> (transits)</li>
          </ul>

          <div style={ctaBoxStyle}>
            <p style={ctaTextStyle}>
              <strong>CTA:</strong> Get your full archetype, Western + BaZi unified. Define your goals. Start your Live OS.
            </p>
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

const leadStyle: React.CSSProperties = {
  fontSize: '1.2rem',
  lineHeight: 1.7,
  color: 'rgba(248,250,252,0.85)',
  marginBottom: '2rem',
};

const h2Style: React.CSSProperties = {
  margin: '2.5rem 0 1rem',
  fontSize: '1.6rem',
  letterSpacing: '-0.02em',
  color: 'var(--color-bg-secondary)',
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

const tableWrapperStyle: React.CSSProperties = {
  overflowX: 'auto',
  margin: '1.5rem 0',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.9rem',
};

const thStyle: React.CSSProperties = {
  padding: '0.85rem 1rem',
  textAlign: 'left',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'rgba(248,250,252,0.5)',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.85rem 1rem',
  color: 'rgba(248,250,252,0.75)',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
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