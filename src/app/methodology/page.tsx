import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '8os Methodology — How We Bridge Two Ancient Systems',
  description:
    'The synthesis engine that combines Western astrology and BaZi to create 120 unique archetypes. Why we start with your sun sign.',
};

const ZODIAC_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const DAYMASTERS = ['甲 Wood', '乙 Wood', '丙 Fire', '丁 Fire', '戊 Earth', '己 Earth', '庚 Metal', '辛 Metal', '壬 Water', '癸 Water'];

const MAPPING_TABLE = [
  { western: 'Fire signs (Aries, Leo, Sagittarius)', bazi: '火/木 pillars', synthesis: 'Drive, visibility, creative spark → expressed through Daymaster structure' },
  { western: 'Earth signs (Taurus, Virgo, Capricorn)', bazi: '土/金 pillars', synthesis: 'Structure, endurance, material mastery → grounded by Luck Pillar timing' },
  { western: 'Air signs (Gemini, Libra, Aquarius)', bazi: '金/水 pillars', synthesis: 'Intellect, communication, pattern recognition → filtered through Ten Gods' },
  { western: 'Water signs (Cancer, Scorpio, Pisces)', bazi: '水/木 pillars', synthesis: 'Intuition, depth, emotional intelligence → supported by Seasonal strength' },
];

const BARRIER_ISSUES = [
  { num: '01', title: 'Friction', body: 'Many people don\'t know their exact birth time. Asking for it creates abandonment.' },
  { num: '02', title: 'Privacy', body: 'Exact birth time + location is a biometric fingerprint. Many users rightly hesitate.' },
  { num: '03', title: 'Complexity', body: 'A full chart with houses, aspects, and transits overwhelms newcomers.' },
];

export default function MethodologyPage() {
  return (
    <div style={pageStyle}>
      <div style={innerStyle}>
        <div style={headerStyle}>
          <p style={eyebrowStyle}>Methodology</p>
          <h1 style={pageTitleStyle}>How We Bridge Two Ancient Systems — And Why We Start Where You Are</h1>
        </div>

        {/* Synthesis Engine */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>The Synthesis Engine</h2>
          <p style={bodyStyle}>
            Every 8os archetype is the product of two inputs calculated from your birth data, then combined through a
            proprietary synthesis layer that maps your Western expression onto your BaZi structure.
          </p>
          <div style={flowchartStyle}>
            <div style={flowNodeStyle('#a78bfa')}>User Input: Birth Date + Location</div>
            <div style={flowRowStyle}>
              <div style={flowBranchStyle}>
                <div style={flowArrowStyle} />
                <div style={flowNodeStyle('#818cf8')}>Sun Sign Calculation</div>
                <div style={flowSubStyle}>No birth time needed</div>
              </div>
              <div style={flowBranchStyle}>
                <div style={flowArrowStyle} />
                <div style={flowNodeStyle('#818cf8')}>BaZi Calculation</div>
                <div style={flowSubStyle}>Real Solar Time</div>
              </div>
            </div>
            <div style={flowRowStyle}>
              <div style={flowBranchStyle}>
                <div style={flowArrowStyle} />
                <div style={flowNodeStyle('rgba(255,255,255,0.1)')}>Archetype Expression</div>
              </div>
              <div style={flowBranchStyle}>
                <div style={flowArrowStyle} />
                <div style={flowNodeStyle('rgba(255,255,255,0.1)')}>Structural Capacity</div>
              </div>
            </div>
            <div style={flowArrowStyle} />
            <div style={flowNodeStyle('#7c3aed')}>Archetype Synthesis Layer</div>
            <div style={flowArrowStyle} />
            <div style={flowNodeStyle('#5b21b6')}>Unified Profile + Goal Architecture</div>
            <div style={flowArrowStyle} />
            <div style={flowNodeStyle('#4c1d95')}>Live OS Dashboard + AI Journaling</div>
          </div>
        </section>

        <div style={dividerStyle} />

        {/* Why Sun Sign */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Why We Use Sun Sign (Not Full Western Chart)</h2>

          <div style={problemFrameStyle}>
            <h3 style={h3Style}>The Barrier Problem</h3>
            <p style={bodyStyle}>
              A full Western natal chart requires your <strong>exact birth time</strong> — down to the minute. This creates
              three problems:
            </p>
            <div style={barrierGridStyle}>
              {BARRIER_ISSUES.map(({ num, title, body }) => (
                <div key={num} style={barrierCardStyle}>
                  <span style={barrierNumStyle}>{num}</span>
                  <h4 style={barrierTitleStyle}>{title}</h4>
                  <p style={barrierBodyStyle}>{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={solutionFrameStyle}>
            <h3 style={h3Style}>Our Solution: The Sun Sign Gateway</h3>
            <p style={bodyStyle}>
              Your sun sign is your <strong>headline</strong> — accurate enough to be meaningful, accessible enough to be
              shareable. It captures your core identity (ego, vitality, life force) without requiring sensitive data.
            </p>
            <p style={bodyStyle}>
              But here&apos;s the key: <strong>we don&apos;t stop there.</strong> Your sun sign opens the door. Your BaZi
              provides the structural depth. Together, they create a synthesis more powerful than either alone.
            </p>
            <div style={upgradePathStyle}>
              <p style={upgradePathLabelStyle}>The Upgrade Path</p>
              <p style={upgradePathBodyStyle}>
                As users engage, they can optionally add birth time (for full Western chart) and exact location (for
                precise BaZi Hour Pillar). More data = more precision. But never required to start.
              </p>
            </div>
          </div>
        </section>

        <div style={dividerStyle} />

        {/* Archetype Matrix */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>The Archetype Matrix: 12 × 10 = 120 Unique Archetypes</h2>
          <p style={bodyStyle}>
            Every combination of Western sun sign and BaZi Daymaster produces a distinct archetype with its own goal
            strategy, decision style, and optimal timing patterns.
          </p>
          <div style={matrixWrapStyle}>
            <table style={matrixTableStyle}>
              <thead>
                <tr>
                  <th style={matrixThStyle}>Sign</th>
                  {DAYMASTERS.map((dm) => (
                    <th key={dm} style={matrixThStyle}>{dm}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ZODIAC_SIGNS.map((sign, si) => (
                  <tr key={sign}>
                    <td style={matrixSignStyle}>{sign}</td>
                    {DAYMASTERS.map((dm, di) => (
                      <td key={dm} style={matrixCellStyle(sign === 'Capricorn' && dm === '辛 Metal')}>
                        {sign === 'Capricorn' && dm === '辛 Metal' ? (
                          <span style={featuredCellStyle}>Architect-Commander</span>
                        ) : (
                          <span style={emptyCellStyle}>{si * 10 + di + 1}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div style={dividerStyle} />

        {/* Mapping Logic */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Mapping Logic</h2>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Western Element</th>
                  <th style={thStyle}>BaZi Tendency</th>
                  <th style={thStyle}>Synthesis Principle</th>
                </tr>
              </thead>
              <tbody>
                {MAPPING_TABLE.map(({ western, bazi, synthesis }, i) => (
                  <tr key={i} style={i % 2 === 0 ? trEvenStyle : {}}>
                    <td style={tdStyle}>{western}</td>
                    <td style={{ ...tdStyle, color: '#a78bfa', fontFamily: 'monospace' }}>{bazi}</td>
                    <td style={{ ...tdStyle, color: 'rgba(248, 250, 252, 0.65)' }}>{synthesis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section style={ctaSectionStyle}>
          <h2 style={ctaTitleStyle}>Ready to see your synthesis?</h2>
          <div style={ctaGroupStyle}>
            <Link href="/onboarding" style={primaryCtaStyle}>
              Get Your Archetype →
            </Link>
            <Link href="/archetypes/explorer" style={secondaryCtaStyle}>
              Browse All 120 Archetypes
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { background: '#060608', color: 'var(--color-bg-secondary)', minHeight: '100vh' };
const innerStyle: React.CSSProperties = { maxWidth: '1000px', margin: '0 auto', padding: '5rem 2rem' };
const headerStyle: React.CSSProperties = { marginBottom: '4rem' };
const eyebrowStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a78bfa' };
const pageTitleStyle: React.CSSProperties = { margin: 0, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.15, letterSpacing: '-0.03em' };
const sectionStyle: React.CSSProperties = { marginBottom: '1rem' };
const h2Style: React.CSSProperties = { margin: '0 0 1.5rem', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.03em' };
const h3Style: React.CSSProperties = { margin: '0 0 1rem', fontSize: '1.15rem', fontWeight: 700 };
const bodyStyle: React.CSSProperties = { margin: '0 0 1rem', fontSize: '1rem', lineHeight: 1.75, color: 'rgba(248, 250, 252, 0.7)' };
const dividerStyle: React.CSSProperties = { height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '3rem 0' };

const flowchartStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' };
const flowNodeStyle = (bg: string): React.CSSProperties => ({ padding: '0.75rem 1.5rem', borderRadius: '10px', background: bg, color: 'var(--color-bg-secondary)', fontWeight: 600, fontSize: '0.9rem', textAlign: 'center', maxWidth: '340px', width: '100%' });
const flowRowStyle: React.CSSProperties = { display: 'flex', gap: '2rem', justifyContent: 'center', width: '100%' };
const flowBranchStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' };
const flowArrowStyle: React.CSSProperties = { width: '2px', height: '24px', background: 'rgba(255,255,255,0.2)' };
const flowSubStyle: React.CSSProperties = { fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)', textAlign: 'center' };

const problemFrameStyle: React.CSSProperties = { padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem' };
const solutionFrameStyle: React.CSSProperties = { padding: '2rem', borderRadius: '16px', border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.04)' };
const barrierGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' };
const barrierCardStyle: React.CSSProperties = { padding: '1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' };
const barrierNumStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#a78bfa', marginBottom: '0.5rem', letterSpacing: '0.1em' };
const barrierTitleStyle: React.CSSProperties = { margin: '0 0 0.4rem', fontSize: '0.95rem', fontWeight: 700 };
const barrierBodyStyle: React.CSSProperties = { margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: 'rgba(248,250,252,0.55)' };
const upgradePathStyle: React.CSSProperties = { marginTop: '1.5rem', padding: '1.25rem', borderRadius: '12px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' };
const upgradePathLabelStyle: React.CSSProperties = { margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', color: '#a78bfa' };
const upgradePathBodyStyle: React.CSSProperties = { margin: 0, fontSize: '0.9rem', lineHeight: 1.65, color: 'rgba(248,250,252,0.65)' };

const matrixWrapStyle: React.CSSProperties = { overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' };
const matrixTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' };
const matrixThStyle: React.CSSProperties = { padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 600, color: 'rgba(248,250,252,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', whiteSpace: 'nowrap', fontSize: '0.7rem' };
const matrixSignStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', fontWeight: 600, color: 'rgba(248,250,252,0.7)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' };
const matrixCellStyle = (featured: boolean): React.CSSProperties => ({ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: '1px solid rgba(255,255,255,0.04)', background: featured ? 'rgba(124,58,237,0.15)' : undefined });
const featuredCellStyle: React.CSSProperties = { fontSize: '0.65rem', color: '#a78bfa', fontWeight: 700 };
const emptyCellStyle: React.CSSProperties = { fontSize: '0.65rem', color: 'rgba(255,255,255,0.12)' };

const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' };
const thStyle: React.CSSProperties = { padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(248,250,252,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' };
const trEvenStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.02)' };
const tdStyle: React.CSSProperties = { padding: '0.85rem 1rem', color: 'rgba(248,250,252,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' };

const ctaSectionStyle: React.CSSProperties = { marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.08)' };
const ctaTitleStyle: React.CSSProperties = { margin: '0 0 1.5rem', fontSize: '1.75rem', letterSpacing: '-0.03em' };
const ctaGroupStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' };
const primaryCtaStyle: React.CSSProperties = { display: 'inline-block', padding: '0.85rem 1.75rem', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)', color: '#fff', fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' };
const secondaryCtaStyle: React.CSSProperties = { display: 'inline-block', fontSize: '0.95rem', color: 'rgba(248,250,252,0.55)', textDecoration: 'none' };
