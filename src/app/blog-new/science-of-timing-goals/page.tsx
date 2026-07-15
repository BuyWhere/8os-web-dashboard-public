import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'The Science of Timing: Why Some Months Feel Off | 8os.ai',
  description:
    'Why do some months feel harder? BaZi Luck Pillars and Western transit mechanics track the same thing, celestial weather. Learn how to dress for it.',
  openGraph: {
    title: 'The Science of Timing: Why Some Months Feel Off',
    description:
      "It's not 'lucky' or 'unlucky.' It's Luck Pillar transitions. Here's how to use them for goal achievement.",
    type: 'article',
    url: 'https://8os.ai/blog/science-of-timing-goals',
  },
  alternates: {
    canonical: '/blog/science-of-timing-goals',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'The Science of Timing: Why Some Months Feel Off',
  description:
    'Why do some months feel harder? BaZi Luck Pillars and Western transit mechanics track the same thing, celestial weather. Learn how to dress for it.',
  author: { '@type': 'Organization', name: '8os.ai' },
  publisher: { '@type': 'Organization', name: '8os.ai', url: 'https://8os.ai' },
  datePublished: '2026-05-07',
  dateModified: '2026-05-07',
};

export default function ScienceOfTimingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article style={articleStyle}>
        <header style={headerStyle}>
          <Link href="/blog" style={backLinkStyle}>← All Articles</Link>
          <h1 style={h1Style}>The Science of Timing: Why Some Months Feel &apos;Off&apos;</h1>
          <p style={metaStyle}>May 7, 2026 · 8os.ai</p>
        </header>

        <div style={contentStyle}>
          <h2 style={h2Style}>The Phenomenon</h2>
          <p style={pStyle}>You&apos;ve felt it. A month where everything stalls. Then suddenly, momentum returns.</p>
          <p style={pStyle}>In BaZi, it&apos;s <strong>Luck Pillar transition</strong>. In Western astrology, it&apos;s <strong>transit mechanics</strong>. Both track the same thing: <strong>celestial weather changes, and you&apos;re not dressed for it.</strong></p>

          <h2 style={h2Style}>But Here&apos;s the Key: Not &ldquo;Lucky&rdquo; vs. &ldquo;Unlucky&rdquo;</h2>
          <p style={pStyle}>A challenging Luck Pillar isn&apos;t bad luck. It&apos;s <strong>a different kind of work.</strong></p>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Pillar Type</th>
                  <th style={thStyle}>What It Feels Like</th>
                  <th style={thStyle}>How to Use It for Goals</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Supportive</td>
                  <td style={tdStyle}>Flow, ease, opportunity</td>
                  <td style={tdStyle}>Build, expand, launch, commit</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Challenging</td>
                  <td style={tdStyle}>Friction, resistance, testing</td>
                  <td style={tdStyle}>Transform, learn, release, restructure</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Neutral</td>
                  <td style={tdStyle}>Steady, unremarkable</td>
                  <td style={tdStyle}>Maintain, consolidate, prepare</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 style={h2Style}>Understanding Luck Pillars</h2>
          <p style={pStyle}>Your BaZi chart includes 10 Luck Pillars, each lasting 10 years, that represent the cosmic weather of that period of your life.</p>
          <p style={pStyle}>These aren&apos;t random. They&apos;re calculated from your birth data and represent the elemental themes that will dominate each decade.</p>
          <p style={pStyle}><strong>Example:</strong> A person with 辛 Metal (supportive) as their current Luck Pillar might find:</p>
          <ul style={ulStyle}>
            <li>Structure comes naturally</li>
            <li>Authority figures are supportive</li>
            <li>Clarity is enhanced</li>
            <li>Precision work pays off</li>
          </ul>
          <p style={pStyle}>But when they transition to 丙火 (challenging):</p>
          <ul style={ulStyle}>
            <li>Visibility increases but so does scrutiny</li>
            <li>Restructuring is required</li>
            <li>Pride and ego become vulnerabilities</li>
            <li>Transformation becomes necessary</li>
          </ul>

          <h2 style={h2Style}>How to Use Timing for Goals</h2>
          <ol style={olStyle}>
            <li><strong>Set goals during supportive periods</strong>, Launch initiatives when the cosmic weather supports expansion</li>
            <li><strong>Restructure during challenging periods</strong>, Use friction as fuel for transformation, not as evidence of failure</li>
            <li><strong>Match goal type to pillar type</strong>:
              <ul style={ulStyle}>
                <li>Build/expand → Supportive pillars</li>
                <li>Launch/reveal → Supportive-to-challenging transition</li>
                <li>Transform/restructuring → Challenging pillars</li>
                <li>Maintain/preserve → Neutral pillars</li>
              </ul>
            </li>
            <li><strong>Don&apos;t force a Fire launch during a Water pillar</strong>, Your energy will be low for visibility work; pivot to depth instead</li>
          </ol>

          <h2 style={h2Style}>The Key Insight</h2>
          <p style={pStyle}>Timing doesn&apos;t guarantee success, but it dramatically shifts the odds.</p>
          <p style={pStyle}>A goal launched in alignment with supportive cosmic weather has more momentum, fewer obstacles, and more &ldquo;lucky&rdquo; coincidences.</p>
          <p style={pStyle}>A goal launched against the grain requires more effort, more resilience, and more patience, but sometimes the timing chooses you, and that&apos;s okay too.</p>
          <p style={pStyle}><strong>8os tracks your Luck Pillar transitions and tells you what kind of work each period is best suited for.</strong></p>

          <div style={ctaBoxStyle}>
            <p style={ctaTextStyle}>Get your Luck Pillar timeline and discover your optimal goal windows.</p>
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

const pStyle: React.CSSProperties = {
  margin: '0 0 1.25rem',
  color: 'rgba(248,250,252,0.8)',
};

const ulStyle: React.CSSProperties = {
  margin: '0 0 1rem',
  paddingLeft: '1.5rem',
  color: 'rgba(248,250,252,0.8)',
};

const olStyle: React.CSSProperties = {
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