import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import LandingHeader from '@/components/landing/LandingHeader'

// Editorial serif for headlines + clean sans for body. Loaded via
// next/font/google (built into Next 14 — no dependency change). Exposed as
// CSS variables scoped to the landing wrapper so the rest of the app is
// unaffected.
const fraunces = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '8os: Right goal, right season',
  description:
    'Your real BaZi archetype, operated daily. 8os computes your archetype and decade-to-daily timing, then runs your goals and calendar around it, driven by an AI assistant. A life OS, not a horoscope.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: 'https://8os.ai/',
    siteName: '8os',
    title: '8os: Right goal, right season',
    description:
      'Your real BaZi archetype, operated daily. The planner that knows when to push.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: '8os' }],
    locale: 'en_US',
  },
}

// Palette — warm light / editorial
const INK = 'var(--color-text-primary)'
const GRAY = 'var(--color-text-secondary)'
const CREAM = 'var(--color-bg-primary)'
const SURFACE = 'var(--color-bg-card)'
// Theme-aware gold: light --color-accent #7E5C24 on cream ≈ 5.51:1;
// dark --color-accent #d4a366 on charcoal ≈ 7.85:1 (OS-5952). Using accent
// instead of accent-border because accent-border #9A7A3A fails 4.5:1 in dark
// (4.44:1). OS-6800.
const GOLD = 'var(--color-accent)'
/** OS-7128: eyebrow tags on dark charcoal. #E5C396 on #221F1A = 9.20:1 (AA/AAA). */
const GOLD_ON_DARK = '#E5C396'
const HAIRLINE = 'var(--color-border)'
const OXBLOOD = 'var(--color-accent-2)'
const MAXW = 1360

// ── Small SVG chart motif — a simple four-pillar BaZi glyph, tasteful ──
function ChartMotif() {
  return (
    <svg
      viewBox="0 0 320 320"
      width="100%"
      height="100%"
      role="img"
      aria-label="Four pillars chart motif"
      style={{ display: 'block' }}
    >
      <circle cx="160" cy="160" r="150" fill="none" stroke={HAIRLINE} strokeWidth="1.5" />
      <circle cx="160" cy="160" r="110" fill="none" stroke={HAIRLINE} strokeWidth="1.5" />
      {/* four pillars */}
      {[0, 1, 2, 3].map((i) => {
        const x = 70 + i * 60
        const h = [120, 168, 96, 140][i]
        return (
          <g key={i}>
            <rect
              x={x - 12}
              y={230 - h}
              width="24"
              height={h}
              rx="6"
              fill={i === 1 ? GOLD : 'none'}
              stroke={GOLD}
              strokeWidth="1.5"
              opacity={i === 1 ? 0.9 : 0.55}
            />
            <circle cx={x} cy={230 - h - 14} r="5" fill={i === 1 ? OXBLOOD : GOLD} opacity="0.8" />
          </g>
        )
      })}
      <line x1="46" y1="230" x2="274" y2="230" stroke={INK} strokeWidth="1.5" opacity="0.5" />
      <text
        x="160"
        y="272"
        textAnchor="middle"
        fontSize="15"
        letterSpacing="6"
        fill={GRAY}
        fontFamily="var(--font-serif), serif"
      >
        八字
      </text>
    </svg>
  )
}

const HOW_STEPS = [
  {
    n: '01',
    title: 'Enter your birth details',
    body: 'Date and place of birth. That is all we need to compute the four pillars of your chart.',
  },
  {
    n: '02',
    title: 'Meet your archetype',
    body: 'We render your real BaZi chart, one of 17,280 configurations, and translate it into a working archetype you can act on.',
  },
  {
    n: '03',
    title: 'Set your goals',
    body: 'On Free, capture the goals you are working toward and keep them next to your tasks. Pro and Agent Connect turn those into architecture, timing, and a living schedule.',
  },
  {
    n: '04',
    title: 'Let the OS operate daily',
    body: 'Every morning your coach messages you first: your Big 3, your timing, and what you committed to. Through the day it keeps your plan honest, and, honestly, tells you when to push and when to hold.',
  },
]

const FEATURES = [
  {
    title: 'The archetype engine',
    body: 'Your chart resolved to a specific archetype, not a sun sign. 17,280 configurations, computed from your four pillars.',
  },
  {
    title: 'Decade-to-day timing',
    body: 'Luck pillars flow from decade to year to month to day. 8os tracks all four layers so guidance reflects the season you are actually in.',
  },
  {
    title: 'A coach that acts',
    body: 'It remembers you across every session, knows your goals and chart, and actually creates the tasks, events and plans you talk about. Each morning it reaches out first with your brief.',
  },
  {
    title: 'Talk, and it organises you',
    body: 'Journal by voice or text. What you say becomes tasks, calendar events and people to follow up with, confirmed by you in one tap, and remembered from then on.',
  },
  {
    title: 'A calendar that keeps up',
    body: 'Two-way Google sync, tasks you check off right on the grid, repeats that actually repeat, and one tap to replan everything you missed into free slots.',
  },
  {
    title: 'The Alignment Engine',
    body: 'A running check on whether your attention is on the right goal for this season, and a nudge when it drifts.',
  },
]

export default function Home() {
  const serif = 'var(--font-serif), Georgia, serif'
  const sans = 'var(--font-sans), system-ui, -apple-system, sans-serif'

  return (
    <div
      className={`${fraunces.variable} ${inter.variable}`}
      style={{
        background: CREAM,
        color: INK,
        fontFamily: sans,
        minHeight: '100vh',
        // Counteract the global body padding-top (fixed dark header space):
        // our own header sits at the very top of this wrapper.
        marginTop: 'calc(-1 * var(--header-height))',
      }}
    >
      <LandingHeader />

      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section
        style={{
          maxWidth: MAXW,
          margin: '0 auto',
          padding: '5.5rem 2rem 4rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
            gap: '3.5rem',
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          <div>
            <span
              className="landing-gold"
              style={{
                display: 'inline-block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: GOLD_ON_DARK,
                marginBottom: '1.5rem',
              }}
            >
              A life OS, not a horoscope
            </span>
            <h1
              style={{
                fontFamily: serif,
                fontWeight: 500,
                fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                margin: '0 0 1.25rem',
                color: INK,
              }}
            >
              Right goal, right season.
              <span
                style={{
                  display: 'block',
                  fontStyle: 'italic',
                  color: GRAY,
                  fontWeight: 400,
                }}
              >
                The planner that knows when to push.
              </span>
            </h1>
            <p
              style={{
                fontSize: '1.1875rem',
                lineHeight: 1.6,
                color: GRAY,
                maxWidth: '34rem',
                margin: '0 0 2.25rem',
              }}
            >
              8os computes your real BaZi archetype and your decade-to-daily
              timing, then operates your goals and calendar around it, guided
              by an AI assistant that actually does the work.
            </p>
            <a
              href="/onboarding"
              className="landing-gold-fill cta-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.9rem 1.75rem',
                background: GOLD_ON_DARK,
                color: '#221F1A',
                fontWeight: 600,
                fontSize: '1rem',
                borderRadius: '10px',
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(229, 195, 150, 0.28)',
              }}
            >
              Get started
            </a>
          </div>

          <div
            className="hero-motif"
            style={{
              background: SURFACE,
              border: `1px solid ${HAIRLINE}`,
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 24px 60px rgba(34, 31, 26, 0.06)',
            }}
          >
            <ChartMotif />
          </div>
        </div>
      </section>

      {/* ─────────────────────── HOW IT WORKS ─────────────────────── */}
      <section
        id="how"
        style={{
          maxWidth: MAXW,
          margin: '0 auto',
          padding: '4rem 2rem',
          scrollMarginTop: '90px',
        }}
      >
        <SectionHead
          eyebrow="How it works"
          title="From birth chart to daily action."
          serif={serif}
        />
        <div
          className="cards-4"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.25rem',
            marginTop: '2.5rem',
          }}
        >
          {HOW_STEPS.map((s) => (
            <div
              key={s.n}
              style={{
                background: SURFACE,
                border: `1px solid ${HAIRLINE}`,
                borderRadius: '16px',
                padding: '1.75rem 1.5rem',
              }}
            >
              <div
                className="landing-gold"
                style={{
                  fontFamily: serif,
                  fontSize: '1.5rem',
                  color: GOLD,
                  marginBottom: '1rem',
                }}
              >
                {s.n}
              </div>
              <h3
                style={{
                  fontFamily: serif,
                  fontWeight: 600,
                  fontSize: '1.1875rem',
                  margin: '0 0 0.6rem',
                  color: INK,
                  lineHeight: 1.25,
                }}
              >
                {s.title}
              </h3>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: GRAY, margin: 0 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── FEATURES ───────────────────────── */}
      <section
        id="features"
        style={{
          background: SURFACE,
          borderTop: `1px solid ${HAIRLINE}`,
          borderBottom: `1px solid ${HAIRLINE}`,
          scrollMarginTop: '72px',
        }}
      >
        <div style={{ maxWidth: MAXW, margin: '0 auto', padding: '4.5rem 2rem' }}>
          <SectionHead
            eyebrow="What it does"
            title="A system that runs your goals, not a reading."
            serif={serif}
          />
          <div
            className="cards-3"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              alignItems: 'stretch',
              gap: '2rem 2.5rem',
              marginTop: '2.75rem',
            }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} style={{ height: '100%' }}>
                <div
                  style={{
                    width: '2.25rem',
                    height: '2px',
                    background: GOLD,
                    marginBottom: '1.1rem',
                  }}
                />
                <h3
                  style={{
                    fontFamily: serif,
                    fontWeight: 600,
                    fontSize: '1.25rem',
                    margin: '0 0 0.65rem',
                    color: INK,
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.65, color: GRAY, margin: 0 }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── FREE REVEAL BAND ─────────────────── */}
      <section style={{ maxWidth: MAXW, margin: '0 auto', padding: '4.5rem 2rem' }}>
        <div
          style={{
            background: CREAM,
            border: `1px solid ${HAIRLINE}`,
            borderRadius: '20px',
            padding: 'clamp(2rem, 5vw, 3.25rem)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}
        >
          <div style={{ maxWidth: '38rem' }}>
            <h2
              style={{
                fontFamily: serif,
                fontWeight: 500,
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                lineHeight: 1.1,
                margin: '0 0 0.75rem',
                color: INK,
              }}
            >
              See your archetype, free, no signup.
            </h2>
            <p style={{ fontSize: '1.0625rem', lineHeight: 1.6, color: GRAY, margin: 0 }}>
              Enter your birth date and get a real taste of your chart in under a
              minute. No account required.
            </p>
          </div>
          <a
            href="/reveal"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.9rem 1.75rem',
              background: INK,
              color: CREAM,
              fontWeight: 600,
              fontSize: '1rem',
              borderRadius: '10px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Reveal my archetype →
          </a>
        </div>
      </section>

      {/* ───────────────────────── PRICING TEASER ─────────────────── */}
      <section
        style={{
          borderTop: `1px solid ${HAIRLINE}`,
          background: SURFACE,
        }}
      >
        <div
          style={{
            maxWidth: MAXW,
            margin: '0 auto',
            padding: '4.5rem 2rem',
            textAlign: 'center',
          }}
        >
          <span
            className="landing-gold"
            style={{
              display: 'inline-block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: GOLD_ON_DARK,
              marginBottom: '1rem',
            }}
          >
            Pricing
          </span>
          <h2
            style={{
              fontFamily: serif,
              fontWeight: 500,
              fontSize: 'clamp(1.9rem, 4.5vw, 2.75rem)',
              lineHeight: 1.1,
              margin: '0 0 1rem',
              color: INK,
            }}
          >
            Start free. Go Pro for{' '}
            <span style={{ color: OXBLOOD }}>$18/mo</span>.
          </h2>
          <p
            style={{
              fontSize: '1.0625rem',
              lineHeight: 1.6,
              color: GRAY,
              maxWidth: '34rem',
              margin: '0 auto 2rem',
            }}
          >
            Explore your archetype for free. Pro unlocks the full daily OS, the
            assistant, timing, alignment and memory working together.
          </p>
          <a
            href="/pricing"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.9rem 1.75rem',
              border: `1px solid ${INK}`,
              color: INK,
              fontWeight: 600,
              fontSize: '1rem',
              borderRadius: '10px',
              textDecoration: 'none',
            }}
          >
            See pricing
          </a>
        </div>
      </section>

      {/* Footer comes from the shared <Footer /> in root layout (OS-5656). */}

      {/* Responsive rules scoped to the landing */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media (max-width: 900px) {
            .hero-grid { grid-template-columns: 1fr !important; }
            .hero-motif { max-width: 360px; }
            .cards-4 { grid-template-columns: repeat(2, 1fr) !important; }
            .cards-3 { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 560px) {
            .cards-4 { grid-template-columns: 1fr !important; }
            .cards-3 { grid-template-columns: 1fr !important; }
          }
        `,
        }}
      />
    </div>
  )
}

// ── Shared section header ──
function SectionHead({
  eyebrow,
  title,
  serif,
}: {
  eyebrow: string
  title: string
  serif: string
}) {
  return (
    <div style={{ maxWidth: '40rem' }}>
      <span
        className="landing-gold"
        style={{
          display: 'inline-block',
          fontSize: '0.8125rem',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: GOLD_ON_DARK,
          marginBottom: '0.9rem',
        }}
      >
        {eyebrow}
      </span>
      <h2
        style={{
          fontFamily: serif,
          fontWeight: 500,
          fontSize: 'clamp(1.9rem, 4.5vw, 2.75rem)',
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
          margin: 0,
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </h2>
    </div>
  )
}

// The wordmark glyph — an "8" formed with an inner spark tying to 八字.
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="10.5" r="6" stroke="#8A6728" strokeWidth="2" />
      <circle cx="16" cy="21.5" r="6.5" stroke="#221F1A" strokeWidth="2" />
      <path d="M16 6.5 L16 14.5 M12.5 10.5 L19.5 10.5" stroke="var(--color-accent-2)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
