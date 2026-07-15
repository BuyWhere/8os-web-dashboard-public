import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'The Architect-Commander: Capricorn-庚 Metal Archetype | 8os.ai',
  description:
    'Capricorn-庚 Metal builds systems that outlast. Learn how The Architect-Commander achieves goals through structure, authority, and long-term compound growth.',
  openGraph: {
    title: 'Capricorn-庚 Metal: The Architect-Commander',
    description:
      'When the most ambitious Western sign meets the most decisive BaZi Daymaster, you get a goal-achiever who builds to outlast.',
    type: 'article',
    url: 'https://8os.ai/blog/archetype-capricorn-geng-metal',
  },
  alternates: {
    canonical: '/blog/archetype-capricorn-geng-metal',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'The Architect-Commander: Capricorn-庚 Metal Archetype',
  description:
    'Capricorn-庚 Metal builds systems that outlast. Learn how The Architect-Commander achieves goals through structure, authority, and long-term compound growth.',
  author: { '@type': 'Organization', name: '8os.ai' },
  publisher: { '@type': 'Organization', name: '8os.ai', url: 'https://8os.ai' },
  datePublished: '2026-05-07',
  dateModified: '2026-05-07',
};

export default function CapricornGengMetalPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article style={articleStyle}>
        <header style={headerStyle}>
          <Link href="/blog" style={backLinkStyle}>← All Articles</Link>
          <h1 style={h1Style}>The Architect-Commander: Capricorn-庚 Metal Archetype</h1>
          <p style={metaStyle}>May 7, 2026 · 8os.ai</p>
        </header>

        <div style={contentStyle}>
          <h2 style={h2Style}>The Profile</h2>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Western</th>
                  <th style={thStyle}>BaZi</th>
                  <th style={thStyle}>Unified</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Capricorn: Cardinal Earth, Saturn-ruled</td>
                  <td style={tdStyle}>庚 Metal: Yang Metal, sword/axe</td>
                  <td style={tdStyle}>The Architect-Commander</td>
                </tr>
                <tr>
                  <td style={tdStyle} colSpan={3}>Ambition, structure, long-term planning</td>
                  <td style={{ display: 'none' }} />
                  <td style={{ display: 'none' }} />
                </tr>
                <tr>
                  <td style={tdStyle} colSpan={3}>Decisive, authoritative, conflict-ready</td>
                  <td style={{ display: 'none' }} />
                  <td style={{ display: 'none' }} />
                </tr>
                <tr>
                  <td style={tdStyle} colSpan={3}>Builds systems that outlast. Leads through structure. Finds happiness in mastery.</td>
                  <td style={{ display: 'none' }} />
                  <td style={{ display: 'none' }} />
                </tr>
              </tbody>
            </table>
          </div>

          <h2 style={h2Style}>The Archetype Synthesis</h2>
          <p style={pStyle}><strong>Capricorn</strong> brings the <em>desire</em> for achievement, the <em>patience</em> for long-term thinking, and the <em>discipline</em> for sustained effort.</p>
          <p style={pStyle}><strong>庚 Metal</strong> brings the <em>clarity</em> to see what matters, the <em>authority</em> to make hard decisions, and the <em>precision</em> to execute flawlessly.</p>
          <p style={pStyle}>Together: A goal-achiever who builds <strong>institutions, systems, and legacies</strong>, not just careers.</p>

          <h2 style={h2Style}>Goal Achievement Style</h2>
          <h3 style={h3Style}>How They Push Best</h3>
          <ul style={ulStyle}>
            <li>Through <strong>systematic progress</strong>, not heroic sprints</li>
            <li>Through <strong>authority accumulation</strong>, not popularity contests</li>
            <li>Through <strong>long-term compound growth</strong>, not quick wins</li>
            <li>Through <strong>building what outlasts</strong>, not what impresses</li>
            <li>Through <strong>clear hierarchies</strong>, not collaborative consensus</li>
          </ul>

          <h3 style={h3Style}>How They Become Miserable</h3>
          <ul style={ulStyle}>
            <li>Forced to &ldquo;wing it&rdquo; or improvise</li>
            <li>Rewarded for short-term flash over sustained quality</li>
            <li>Working in chaos without structure to impose</li>
            <li>Forced to be the &ldquo;creative visionary&rdquo; instead of the &ldquo;systems builder&rdquo;</li>
            <li>Given authority without resources to execute</li>
          </ul>

          <h2 style={h2Style}>Famous Examples</h2>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Field</th>
                  <th style={thStyle}>How They Expressed It</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Michelle Obama</td>
                  <td style={tdStyle}>Public service, authorship</td>
                  <td style={tdStyle}>Built platforms (Let&apos;s Move, Becoming) with structural impact beyond her tenure</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Jeff Bezos</td>
                  <td style={tdStyle}>Commerce, technology</td>
                  <td style={tdStyle}>Systematized logistics at scale; long-term orientation over quarterly profits</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Denzel Washington</td>
                  <td style={tdStyle}>Acting, directing</td>
                  <td style={tdStyle}>Built career through consistent excellence and authority, not trend-chasing</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Tim Cook</td>
                  <td style={tdStyle}>Technology leadership</td>
                  <td style={tdStyle}>Operational mastery, supply chain architecture, steady execution post-Jobs</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Stephen Hawking</td>
                  <td style={tdStyle}>Theoretical physics</td>
                  <td style={tdStyle}>Structured the universe mathematically; persistence through physical limitation</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 style={h2Style}>How to Work With This Archetype</h2>
          <ol style={olStyle}>
            <li><strong>Accept that you build, not blaze</strong>, Your path is institutional, not revolutionary. Own it.</li>
            <li><strong>Find the system worth building</strong>, Not all structures are worth your lifetime. Choose wisely.</li>
            <li><strong>Protect your authority</strong>, You lead through competence and structure, not charisma. Build competence, then build around it.</li>
            <li><strong>Time your reveals</strong>, Metal is hidden until sharp. But people need to see you to follow. Find the right moments for visibility.</li>
            <li><strong>Rest in structure</strong>, Your element is refined through discipline, not through letting go. Your rest should still feel purposeful.</li>
          </ol>

          <div style={ctaBoxStyle}>
            <p style={ctaTextStyle}>Discover your full archetype profile and daily alignment.</p>
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