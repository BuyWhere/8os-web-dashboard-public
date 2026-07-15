import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'You Control the Journey: Agency Over Fate in 8os | 8os.ai',
  description:
    "Astrology doesn't predict your fate, it reveals your path. Learn how 8os.ai helps you navigate your journey with goal-native architecture, not deterministic predictions.",
  openGraph: {
    title: 'You Control the Journey, Not the Stars',
    description:
      "The stars don't control you. They illuminate your way. You walk it. Here's how 8os.ai supports agency over fate.",
    type: 'article',
    url: 'https://8os.ai/blog/agency-over-fate',
  },
  alternates: {
    canonical: '/blog/agency-over-fate',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'You Control the Journey: Agency Over Fate in 8os',
  description:
    "Astrology doesn't predict your fate, it reveals your path. Learn how 8os.ai helps you navigate your journey with goal-native architecture, not deterministic predictions.",
  author: { '@type': 'Organization', name: '8os.ai' },
  publisher: { '@type': 'Organization', name: '8os.ai', url: 'https://8os.ai' },
  datePublished: '2026-05-07',
  dateModified: '2026-05-07',
};

export default function AgencyOverFatePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article style={articleStyle}>
        <header style={headerStyle}>
          <Link href="/blog" style={backLinkStyle}>← All Articles</Link>
          <h1 style={h1Style}>You Control the Journey: Agency Over Fate in 8os</h1>
          <p style={metaStyle}>May 7, 2026 · 8os.ai</p>
        </header>

        <div style={contentStyle}>
          <h2 style={h2Style}>The Misconception</h2>
          <p style={pStyle}>Astrology predicts your fate. You&apos;re either lucky or unlucky. What will be, will be.</p>

          <h2 style={h2Style}>The Truth</h2>
          <p style={pStyle}>Astrology reveals your <strong>path</strong>. You control your <strong>journey</strong>.</p>

          <h2 style={h2Style}>The Path vs. The Journey</h2>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Your Path (Archetype)</th>
                  <th style={thStyle}>Your Journey (Choices)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Capricorn-庚 Metal: Built for structure</td>
                  <td style={tdStyle}>You choose: corporate ladder, entrepreneurship, community organizing, artistic discipline</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Leo-丙火: Built for visibility</td>
                  <td style={tdStyle}>You choose: stage, classroom, activism, leadership, creative expression</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Pisces-癸水: Built for depth</td>
                  <td style={tdStyle}>You choose: therapy, art, spirituality, research, emotional leadership</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={pStyle}>The path is <strong>how</strong> you&apos;re built. The journey is <strong>what</strong> you build.</p>

          <h2 style={h2Style}>Why Predictions Miss the Point</h2>
          <p style={pStyle}>&ldquo;2027 is your year for love&rdquo; doesn&apos;t help you:</p>
          <ul style={ulStyle}>
            <li>Actually, it might paralyze you, waiting instead of acting</li>
            <li>It doesn&apos;t tell you <em>how</em> to approach relationships</li>
            <li>It doesn&apos;t respect your unique archetype and needs</li>
          </ul>
          <p style={pStyle}>What helps:</p>
          <ul style={ulStyle}>
            <li>&ldquo;Your archetype thrives in depth over breadth, choose quality connections over quantity&rdquo;</li>
            <li>&ldquo;Your Fire element is dominant this period, visibility will come easier&rdquo;</li>
            <li>&ldquo;Your journal shows you value independence, ensure any partnership respects that&rdquo;</li>
          </ul>
          <p style={pStyle}><strong>8os.ai doesn&apos;t say &ldquo;this will happen.&rdquo; It says &ldquo;here&apos;s how you&apos;re built, and here&apos;s what that means for your choices.&rdquo;</strong></p>

          <h2 style={h2Style}>How 8os.ai Supports Agency</h2>

          <h3 style={h3Style}>No Deterministic Predictions</h3>
          <p style={pStyle}>We don&apos;t say &ldquo;you will get married in 2027.&rdquo;</p>
          <p style={pStyle}>We say &ldquo;your relationship pillar is active in 2027, optimal for commitment if you choose it.&rdquo;</p>

          <h3 style={h3Style}>Goal-Native Architecture</h3>
          <p style={pStyle}>You define success. We optimize the path.</p>

          <h3 style={h3Style}>Journal Reflection</h3>
          <p style={pStyle}>&ldquo;You mentioned feeling &apos;trapped&apos; 5x this week. Your path values freedom. Is your current goal actually yours?&rdquo;</p>

          <h3 style={h3Style}>Timing, Not Fate</h3>
          <p style={pStyle}>&ldquo;Launch now or wait?&rdquo; → &ldquo;Your timing supports launches in Q3. But the decision is yours.&rdquo;</p>

          <h2 style={h2Style}>The Key Distinction</h2>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Deterministic Astrology</th>
                  <th style={thStyle}>8os.ai Approach</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>&ldquo;You will succeed in 2027&rdquo;</td>
                  <td style={tdStyle}>&ldquo;2027&apos;s Luck Pillar supports your archetype&apos;s strengths, maximize that energy&rdquo;</td>
                </tr>
                <tr>
                  <td style={tdStyle}>&ldquo;You will meet your soulmate in June&rdquo;</td>
                  <td style={tdStyle}>&ldquo;June&apos;s transit supports relationship energy, be open and present&rdquo;</td>
                </tr>
                <tr>
                  <td style={tdStyle}>&ldquo;You&apos;re meant for creative work&rdquo;</td>
                  <td style={tdStyle}>&ldquo;Your archetype expresses best through creative channels, find your medium&rdquo;</td>
                </tr>
                <tr>
                  <td style={tdStyle}>&ldquo;It&apos;s written in the stars&rdquo;</td>
                  <td style={tdStyle}>&ldquo;Here&apos;s your operating system, what you build with it is up to you&rdquo;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 style={h2Style}>Living Your Archetype with Agency</h2>
          <ol style={olStyle}>
            <li><strong>Own your nature</strong>, Don&apos;t fight what you&apos;re built for</li>
            <li><strong>Choose your path</strong>, Many paths express the same archetype</li>
            <li><strong>Use the timing</strong>, Align action with cosmic support, but don&apos;t wait for permission</li>
            <li><strong>Define success</strong>, Your goals, your definition</li>
            <li><strong>Revise as you grow</strong>, Your archetype is fixed; your goals evolve</li>
          </ol>

          <p style={pStyle}><strong>The stars don&apos;t control you. They illuminate your way. You walk it.</strong></p>

          <div style={ctaBoxStyle}>
            <p style={ctaTextStyle}>Start defining your path, get your archetype and set your goals.</p>
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
  background: 'var(--color-bg-primary)',
  color: 'var(--color-text-primary)',
  minHeight: '100vh',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '3rem',
  paddingBottom: '2rem',
  borderBottom: '1px solid var(--color-border)',
};

const backLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '1.5rem',
  color: 'var(--color-accent)',
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
  color: 'var(--color-text-secondary)',
};

const contentStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  lineHeight: 1.8,
};

const h2Style: React.CSSProperties = {
  margin: '2.5rem 0 1rem',
  fontSize: '1.5rem',
  letterSpacing: '-0.02em',
  color: 'var(--color-text-primary)',
};

const h3Style: React.CSSProperties = {
  margin: '1.5rem 0 0.75rem',
  fontSize: '1.15rem',
  color: 'var(--color-accent)',
};

const pStyle: React.CSSProperties = {
  margin: '0 0 1.25rem',
  color: 'var(--color-text-secondary)',
};

const ulStyle: React.CSSProperties = {
  margin: '0 0 1.5rem',
  paddingLeft: '1.5rem',
  color: 'var(--color-text-secondary)',
};

const olStyle: React.CSSProperties = {
  margin: '0 0 1.5rem',
  paddingLeft: '1.5rem',
  color: 'var(--color-text-secondary)',
};

const tableWrapperStyle: React.CSSProperties = {
  overflowX: 'auto',
  margin: '1.5rem 0',
  borderRadius: '12px',
  border: '1px solid var(--color-border)',
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
  color: 'var(--color-text-secondary)',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.85rem 1rem',
  color: 'var(--color-text-secondary)',
  borderBottom: '1px solid var(--color-border)',
};

const ctaBoxStyle: React.CSSProperties = {
  margin: '3rem 0',
  padding: '2rem',
  borderRadius: '16px',
  background: 'var(--color-accent-soft)',
  border: '1px solid var(--color-accent-soft)',
  textAlign: 'center',
};

const ctaTextStyle: React.CSSProperties = {
  margin: '0 0 1.25rem',
  fontSize: '1rem',
  color: 'var(--color-text-secondary)',
};

const ctaButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.9rem 1.75rem',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent) 100%)',
  color: '#fff',
  fontWeight: 700,
  textDecoration: 'none',
  fontSize: '1rem',
  boxShadow: '0 8px 24px var(--color-accent-soft)',
};