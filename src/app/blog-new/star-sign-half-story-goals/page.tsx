import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Why Your Star Sign Only Tells Half the Story | 8os.ai',
  description:
    "Your sun sign is your headline — not your profile. Learn why Western astrology alone isn't enough for goal achievement and how BaZi fills the gap.",
  openGraph: {
    title: 'Why Your Star Sign Only Tells Half the Story',
    description:
      '600 million Capricorns. But only one has your BaZi. Here\'s why sun signs aren\'t enough for goal architecture.',
    type: 'article',
    url: 'https://8os.ai/blog/star-sign-half-story-goals',
  },
  alternates: {
    canonical: '/blog/star-sign-half-story-goals',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Why Your Star Sign Only Tells Half the Story',
  description:
    "Your sun sign is your headline — not your profile. Learn why Western astrology alone isn't enough for goal achievement and how BaZi fills the gap.",
  author: { '@type': 'Organization', name: '8os.ai' },
  publisher: { '@type': 'Organization', name: '8os.ai', url: 'https://8os.ai' },
  datePublished: '2026-05-07',
  dateModified: '2026-05-07',
};

export default function StarSignHalfStoryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article style={articleStyle}>
        <header style={headerStyle}>
          <Link href="/blog" style={backLinkStyle}>← All Articles</Link>
          <h1 style={h1Style}>Why Your Star Sign Only Tells Half the Story</h1>
          <p style={metaStyle}>May 7, 2026 · 8os.ai</p>
        </header>

        <div style={contentStyle}>
          <p style={leadStyle}>
            &ldquo;You&apos;re a Capricorn? So are 600 million other people. But only one of them has your BaZi.&rdquo;
          </p>
          <p style={pStyle}>
            Your sun sign is your <strong>headline</strong> — catchy, shareable, broadly true. But it&apos;s not your <strong>profile</strong>. It&apos;s not your operating manual. And it&apos;s definitely not your goal architecture.
          </p>

          <h2 style={h2Style}>The Three Things Your Sun Sign Can&apos;t Tell You</h2>

          <h3 style={h3Style}>1. Your Structural Capacity for Goals</h3>
          <p style={pStyle}>Capricorn says &ldquo;ambitious.&rdquo; But can you sustain that ambition? For how long? Through what method?</p>
          <p style={pStyle}>BaZi Daymaster answers:</p>
          <ul style={ulStyle}>
            <li><strong>庚 Metal</strong> sustains through authority and system-building</li>
            <li><strong>戊土</strong> sustains through patience and routine</li>
            <li><strong>丙火</strong> sustains through visibility and recognition</li>
          </ul>
          <p style={pStyle}>Same ambition, different engine.</p>

          <h3 style={h3Style}>2. Your Optimal Timing</h3>
          <p style={pStyle}>&ldquo;This month is good for career&rdquo; — which week? which day? which hour?</p>
          <p style={pStyle}>BaZi Luck Pillars pinpoint <strong>decades, years, months</strong> of support and challenge. Your sun sign can&apos;t tell you when to push and when to rest.</p>

          <h3 style={h3Style}>3. What Success Actually Feels Like for You</h3>
          <ul style={ulStyle}>
            <li>Capricorn + <strong>庚 Metal</strong>: Success feels like building something that outlasts you</li>
            <li>Capricorn + <strong>癸水</strong>: Success feels like depth, meaning, emotional resonance — even if the world doesn&apos;t see it</li>
            <li>Capricorn + <strong>丙火</strong>: Success feels like recognition, visibility, being seen</li>
          </ul>

          <h2 style={h2Style}>The 8os Synthesis</h2>
          <p style={pStyle}>We don&apos;t discard your sun sign. We <strong>upgrade</strong> it into a goal-native system.</p>
          <p style={pStyle}>Your Capricorn ambition + 庚 Metal structure = &ldquo;The Architect-Commander&rdquo; who builds systems that outlast competitors.</p>
          <p style={pStyle}>Your 8os dashboard will alert you when it&apos;s time to <strong>construct</strong> (Metal periods), <strong>burn</strong> (Fire periods for visibility), <strong>flow</strong> (Water periods for intuition), or <strong>grow</strong> (Wood periods for expansion) — all in service of <em>your</em> stated goals.</p>

          <h2 style={h2Style}>Why This Matters for Goals</h2>
          <p style={pStyle}>Most people set goals based on what <em>sounds</em> good — what society values, what success looks like externally. But your archetype reveals:</p>
          <ul style={ulStyle}>
            <li><strong>What actually satisfies you</strong> (not what you think should satisfy you)</li>
            <li><strong>How you need to approach work</strong> (not just what work to do)</li>
            <li><strong>When to act and when to wait</strong> (not just what to pursue)</li>
          </ul>
          <p style={pStyle}>A goal set in alignment with your archetype isn&apos;t just more achievable — it&apos;s more <em>fulfilling</em>.</p>

          <div style={ctaBoxStyle}>
            <p style={ctaTextStyle}>Get your unified archetype — Western + BaZi. Discover your real goal architecture.</p>
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
  fontSize: '1.15rem',
  lineHeight: 1.7,
  color: 'rgba(248,250,252,0.9)',
  fontStyle: 'italic',
  marginBottom: '2rem',
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