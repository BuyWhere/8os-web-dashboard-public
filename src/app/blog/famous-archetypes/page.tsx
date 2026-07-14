import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Famous Archetypes: How the Stars Built Success | 8os.ai',
  description:
    "Success isn't random, it's patterned. Explore how celebrities and leaders express their Fire, Earth, Metal, Water, and Wood archetypes in their path to achievement.",
  openGraph: {
    title: 'Famous Archetypes: How the Stars Built Success',
    description:
      'Bill Gates. Beyoncé. Steve Jobs. Michelle Obama. See how their archetypes shaped their success patterns.',
    type: 'article',
    url: 'https://8os.ai/blog/famous-archetypes',
  },
  alternates: {
    canonical: '/blog/famous-archetypes',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Famous Archetypes: How the Stars Built Success',
  description:
    "Success isn't random, it's patterned. Explore how celebrities and leaders express their Fire, Earth, Metal, Water, and Wood archetypes in their path to achievement.",
  author: { '@type': 'Organization', name: '8os.ai' },
  publisher: { '@type': 'Organization', name: '8os.ai', url: 'https://8os.ai' },
  datePublished: '2026-05-07',
  dateModified: '2026-05-07',
};

export default function FamousArchetypesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article style={articleStyle}>
        <header style={headerStyle}>
          <Link href="/blog" style={backLinkStyle}>← All Articles</Link>
          <h1 style={h1Style}>Famous Archetypes: How the Stars Built Success</h1>
          <p style={metaStyle}>May 7, 2026 · 8os.ai</p>
        </header>

        <div style={contentStyle}>
          <h2 style={h2Style}>The Premise</h2>
          <p style={pStyle}>Success isn&apos;t random. It&apos;s patterned. And those patterns show up in the archetypes.</p>

          <h2 style={h2Style}>Fire Archetypes</h2>
          <p style={pStyle}><em>Aries, Leo, Sagittarius + Fire/Wood Daymasters</em></p>
          <p style={pStyle}>Fire achieves through <strong>visibility, transformation, and spark</strong>. They burn bright and draw attention, but fire also destroys before it creates.</p>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Sign</th>
                  <th style={thStyle}>Daymaster</th>
                  <th style={thStyle}>Field</th>
                  <th style={thStyle}>Success Pattern</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Robert Downey Jr.</td>
                  <td style={tdStyle}>Aries</td>
                  <td style={tdStyle}>丙火</td>
                  <td style={tdStyle}>Acting</td>
                  <td style={tdStyle}>Visibility, reinvention, public redemption</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Madonna</td>
                  <td style={tdStyle}>Leo</td>
                  <td style={tdStyle}>丁火</td>
                  <td style={tdStyle}>Music</td>
                  <td style={tdStyle}>Constant reinvention, staying in the spotlight</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Walt Disney</td>
                  <td style={tdStyle}>Sagittarius</td>
                  <td style={tdStyle}>甲木</td>
                  <td style={tdStyle}>Entertainment</td>
                  <td style={tdStyle}>Visionary expansion, building imaginary worlds</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Lady Gaga</td>
                  <td style={tdStyle}>Aries</td>
                  <td style={tdStyle}>丙火</td>
                  <td style={tdStyle}>Music/Activism</td>
                  <td style={tdStyle}>Radical visibility, using platform for change</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={pStyle}><strong>Fire Lesson:</strong> Success comes through visibility, but fire must choose what to burn, and when.</p>

          <h2 style={h2Style}>Earth/Metal Archetypes</h2>
          <p style={pStyle}><em>Taurus, Virgo, Capricorn + Earth/Metal Daymasters</em></p>
          <p style={pStyle}>Earth and Metal achieve through <strong>structure, precision, and sustained effort</strong>. They build to last.</p>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Sign</th>
                  <th style={thStyle}>Daymaster</th>
                  <th style={thStyle}>Field</th>
                  <th style={thStyle}>Success Pattern</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Warren Buffett</td>
                  <td style={tdStyle}>Virgo</td>
                  <td style={tdStyle}>己土</td>
                  <td style={tdStyle}>Finance</td>
                  <td style={tdStyle}>Patient, methodical, compound growth</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Beyoncé</td>
                  <td style={tdStyle}>Virgo</td>
                  <td style={tdStyle}>辛金</td>
                  <td style={tdStyle}>Music</td>
                  <td style={tdStyle}>Precision, perfectionism, controlled output</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Jack Ma</td>
                  <td style={tdStyle}>Virgo</td>
                  <td style={tdStyle}>戊土</td>
                  <td style={tdStyle}>Technology</td>
                  <td style={tdStyle}>Methodical empire-building, teaching-focused</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Dwayne Johnson</td>
                  <td style={tdStyle}>Taurus</td>
                  <td style={tdStyle}>庚金</td>
                  <td style={tdStyle}>Entertainment</td>
                  <td style={tdStyle}>Physical authority, work ethic, structural brand</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={pStyle}><strong>Earth/Metal Lesson:</strong> Success comes through systems and patience. The shortcut is the long way.</p>

          <h2 style={h2Style}>Water Archetypes</h2>
          <p style={pStyle}><em>Cancer, Scorpio, Pisces + Water/Wood Daymasters</em></p>
          <p style={pStyle}>Water achieves through <strong>depth, intuition, and transformation</strong>. Water doesn&apos;t push, it flows and finds the cracks.</p>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Sign</th>
                  <th style={thStyle}>Daymaster</th>
                  <th style={thStyle}>Field</th>
                  <th style={thStyle}>Success Pattern</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Bill Gates</td>
                  <td style={tdStyle}>Scorpio</td>
                  <td style={tdStyle}>壬水</td>
                  <td style={tdStyle}>Technology</td>
                  <td style={tdStyle}>Strategic depth, seeing patterns others miss</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Pablo Picasso</td>
                  <td style={tdStyle}>Scorpio</td>
                  <td style={tdStyle}>癸水</td>
                  <td style={tdStyle}>Art</td>
                  <td style={tdStyle}>Emotional intensity, transformative periods</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Rihanna</td>
                  <td style={tdStyle}>Pisces</td>
                  <td style={tdStyle}>壬水</td>
                  <td style={tdStyle}>Music/Business</td>
                  <td style={tdStyle}>Intuitive expansion, fluid across industries</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Steve Jobs</td>
                  <td style={tdStyle}>Pisces</td>
                  <td style={tdStyle}>癸水</td>
                  <td style={tdStyle}>Technology</td>
                  <td style={tdStyle}>Visionary intuition, perfectionism through feeling</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Kurt Cobain</td>
                  <td style={tdStyle}>Pisces</td>
                  <td style={tdStyle}>癸水</td>
                  <td style={tdStyle}>Music</td>
                  <td style={tdStyle}>Depth, authenticity, emotional rawness</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={pStyle}><strong>Water Lesson:</strong> Success comes through depth and authenticity, not through fitting in.</p>

          <h2 style={h2Style}>Air Archetypes</h2>
          <p style={pStyle}><em>Gemini, Libra, Aquarius + Metal/Water Daymasters</em></p>
          <p style={pStyle}>Air achieves through <strong>connection, communication, and ideas</strong>. Air doesn&apos;t build structures, it creates networks.</p>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Sign</th>
                  <th style={thStyle}>Daymaster</th>
                  <th style={thStyle}>Field</th>
                  <th style={thStyle}>Success Pattern</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>John Lennon</td>
                  <td style={tdStyle}>Libra</td>
                  <td style={tdStyle}>辛金</td>
                  <td style={tdStyle}>Music</td>
                  <td style={tdStyle}>Harmony-seeking, idealistic, relational artistry</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Oprah Winfrey</td>
                  <td style={tdStyle}>Aquarius</td>
                  <td style={tdStyle}>壬水</td>
                  <td style={tdStyle}>Media</td>
                  <td style={tdStyle}>Intellectual empathy, platform for others</td>
                </tr>
                <tr>
                  <td style={tdStyle}>J.K. Rowling</td>
                  <td style={tdStyle}>Leo</td>
                  <td style={tdStyle}>癸水</td>
                  <td style={tdStyle}>Literature</td>
                  <td style={tdStyle}>World-building depth; public persona Leo</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={pStyle}><strong>Air Lesson:</strong> Success comes through connection and meaning, not through isolation or competition.</p>

          <h2 style={h2Style}>The Pattern</h2>
          <p style={pStyle}>Success isn&apos;t about <em>which</em> sign or <em>which</em> element, it&apos;s about <strong>alignment</strong>:</p>
          <ol style={olStyle}>
            <li><strong>Self-awareness</strong>, Knowing your archetype and how you actually work</li>
            <li><strong>Strategy alignment</strong>, Pursuing goals in ways that match your nature</li>
            <li><strong>Timing alignment</strong>, Acting when cosmic weather supports your archetype</li>
            <li><strong>Happiness alignment</strong>, Defining success in terms that actually satisfy you</li>
          </ol>

          <div style={ctaBoxStyle}>
            <p style={ctaTextStyle}>Discover your archetype and how it shapes your path to success.</p>
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
  fontSize: '0.85rem',
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 0.85rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-bg-card)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 0.85rem',
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