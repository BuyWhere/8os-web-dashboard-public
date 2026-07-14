import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How 8os Works: From Birth Data to Daily Briefings | 8os.ai',
  description:
    'Enter your birth date. Get your archetype. Set your goals. Receive daily briefings optimized for your BaZi nature. Here\'s how 8os.ai works.',
  openGraph: {
    title: 'How 8os Works: From Birth Data to Daily Briefings',
    description:
      'Enter your birth date. Get your archetype. Set your goals. Receive daily briefings optimized for your BaZi nature.',
    type: 'article',
  },
};

const INTEGRATIONS = [
  { category: 'Calendar', apps: ['Google Calendar', 'Outlook', 'Apple Calendar'] },
  { category: 'Health', apps: ['Apple Health', 'Fitbit', 'Garmin', 'Oura Ring', 'Strava'] },
  { category: 'Productivity', apps: ['Todoist', 'Notion', 'Trello', 'Asana', 'ClickUp'] },
  { category: 'AI Agent', apps: ['Claude', 'GPT', 'Local LLM via API'] },
];

const GOAL_COMPARISON = [
  {
    situation: 'You miss a milestone',
    traditional: 'Guilt, red alert, "try harder"',
    with8os: '"Your 火 period ended. 土 period begins — shift from creation to structure. Adjust timeline."',
  },
  {
    situation: 'You\'re procrastinating',
    traditional: 'Punishment, streak loss',
    with8os: '"Your journal shows \'overwhelm\' 5x. Your archetype needs smaller chunks. Try 25-min sprints."',
  },
  {
    situation: 'You achieve a goal',
    traditional: 'Badge, celebration',
    with8os: '"This success fits your 庚 Metal pattern. What next? Your Luck Pillar supports expansion in 2027."',
  },
  {
    situation: 'You\'re unhappy despite success',
    traditional: 'Nothing',
    with8os: '"Your goal was \'get promoted\' but journal shows \'empty\' 8x. Consider: is this success aligned with your 癸水 need for meaning?"',
  },
];

export default function HowItWorksPage() {
  return (
    <div style={pageStyle}>
      <div style={innerStyle}>
        <div style={headerStyle}>
          <p style={eyebrowStyle}>How It Works</p>
          <h1 style={pageTitleStyle}>From Birth Data to Live OS in 3 Minutes — Then, Achieve What Matters</h1>
        </div>

        {/* Step 1 */}
        <section style={stepSectionStyle}>
          <div style={stepHeaderStyle}>
            <div style={stepNumStyle}>01</div>
            <h2 style={stepTitleStyle}>The Gateway <span style={stepTimeStyle}>30 seconds</span></h2>
          </div>
          <p style={bodyStyle}>
            Enter your birth date and location. Get your unified archetype card instantly. Set your first goal — what
            does &ldquo;best self&rdquo; mean to you?
          </p>
          <div style={goalExamplesStyle}>
            {GOAL_EXAMPLES.map(({ category, examples }) => (
              <div key={category} style={goalCategoryStyle}>
                <p style={goalCategoryLabelStyle}>{category}</p>
                <div style={goalTagsStyle}>
                  {examples.map((ex) => (
                    <span key={ex} style={goalTagStyle}>{ex}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={dividerStyle} />

        {/* Step 2 */}
        <section style={stepSectionStyle}>
          <div style={stepHeaderStyle}>
            <div style={stepNumStyle}>02</div>
            <h2 style={stepTitleStyle}>The Installation <span style={stepTimeStyle}>2 minutes</span></h2>
          </div>
          <p style={bodyStyle}>
            Create your account. Confirm your archetype accuracy. Set 1–3 active goals with timelines. Connect
            integrations to make your OS truly live.
          </p>
          <div style={integrationsGridStyle}>
            {INTEGRATIONS.map(({ category, apps }) => (
              <div key={category} style={integrationCardStyle}>
                <p style={integrationCategoryStyle}>{category}</p>
                <div style={integrationAppsStyle}>
                  {apps.map((app) => (
                    <span key={app} style={integrationAppStyle}>{app}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={dividerStyle} />

        {/* Step 3 / Dashboard */}
        <section style={stepSectionStyle}>
          <div style={stepHeaderStyle}>
            <div style={stepNumStyle}>03</div>
            <h2 style={stepTitleStyle}>The Live OS <span style={stepTimeStyle}>Ongoing</span></h2>
          </div>
          <p style={bodyStyle}>
            Your dashboard updates continuously — archetype timing, goal progress, health sync, journal insights, and
            relationship nudges all in one coherent system.
          </p>

          {/* Scenario A */}
          <div style={scenarioStyle}>
            <p style={scenarioLabelStyle}>Scenario A: The Capricorn-庚 Metal Entrepreneur</p>
            <p style={scenarioGoalStyle}>Goal: Launch consulting business by Q3</p>
            <div style={dashMockStyle}>
              <div style={dashMockHeaderStyle}>
                <span style={dashDotStyle('#4ade80')} />
                <span style={dashDotStyle('#facc15')} />
                <span style={dashDotStyle('#f87171')} />
                <span style={dashMockTitleStyle}>8os Live OS — Capricorn-庚 Metal</span>
              </div>
              <div style={dashMockBodyStyle}>
                <div style={dashRowStyle}>
                  <span style={dashLabelStyle}>Current Mode</span>
                  <span style={dashValueStyle}>STRUCTURE &amp; BUILD</span>
                </div>
                <div style={dashRowStyle}>
                  <span style={dashLabelStyle}>Today&apos;s Timing Score</span>
                  <span style={{ ...dashValueStyle, color: '#4ade80' }}>91 / 100</span>
                </div>
                <div style={dashRowStyle}>
                  <span style={dashLabelStyle}>Launch consulting</span>
                  <span style={{ ...dashValueStyle, color: '#a78bfa' }}>73% — Incorporate next</span>
                </div>
                <div style={dashDivStyle} />
                <p style={dashInsightStyle}>
                  💪 Sleep 6.2h avg (↓12%): &ldquo;Metal needs rest to stay sharp. Block 7.5h tonight.&rdquo;
                </p>
                <p style={dashInsightStyle}>
                  📝 Journal: &ldquo;Your 庚 Metal thrives on structure, not chaos. Try batching client calls to Tuesdays only.&rdquo;
                </p>
                <p style={dashNudgeStyle}>💡 Relationship nudge: Venus enters 7th house Thursday — schedule date night</p>
              </div>
            </div>
          </div>

          {/* Scenario B */}
          <div style={scenarioStyle}>
            <p style={scenarioLabelStyle}>Scenario B: The Pisces-癸水 Therapist</p>
            <p style={scenarioGoalStyle}>Goal: Build private practice, 20 clients by June</p>
            <div style={dashMockStyle}>
              <div style={dashMockHeaderStyle}>
                <span style={dashDotStyle('#4ade80')} />
                <span style={dashDotStyle('#facc15')} />
                <span style={dashDotStyle('#f87171')} />
                <span style={dashMockTitleStyle}>8os Live OS — Pisces-癸水</span>
              </div>
              <div style={dashMockBodyStyle}>
                <div style={dashRowStyle}>
                  <span style={dashLabelStyle}>Current Mode</span>
                  <span style={dashValueStyle}>DEPTH &amp; INTUITION</span>
                </div>
                <div style={dashRowStyle}>
                  <span style={dashLabelStyle}>Private practice</span>
                  <span style={{ ...dashValueStyle, color: '#a78bfa' }}>12/20 clients</span>
                </div>
                <div style={dashDivStyle} />
                <p style={dashInsightStyle}>
                  📝 Journal: &ldquo;You&apos;ve used &apos;drained&apos; 6x. Your 癸水 needs solitude before client sessions — block 30 min morning quiet.&rdquo;
                </p>
                <p style={dashInsightStyle}>
                  🌊 Water period active: optimal for deep client work, referral conversations, and word-of-mouth growth.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div style={dividerStyle} />

        {/* How goals change */}
        <section style={stepSectionStyle}>
          <h2 style={sectionTitleStyle}>How Goals Change in 8os</h2>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Situation</th>
                  <th style={thStyle}>Traditional App</th>
                  <th style={{ ...thStyle, color: '#a78bfa' }}>8os.ai</th>
                </tr>
              </thead>
              <tbody>
                {GOAL_COMPARISON.map(({ situation, traditional, with8os }, i) => (
                  <tr key={i} style={i % 2 === 0 ? trEvenStyle : {}}>
                    <td style={tdStyle}>{situation}</td>
                    <td style={{ ...tdStyle, color: 'rgba(248,250,252,0.45)' }}>{traditional}</td>
                    <td style={{ ...tdStyle, color: 'var(--color-bg-secondary)', fontStyle: 'italic' }}>{with8os}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section style={ctaSectionStyle}>
          <h2 style={ctaTitleStyle}>Start your Live OS</h2>
          <p style={ctaBodyStyle}>Free. 30 seconds. No credit card required.</p>
          <div style={ctaGroupStyle}>
            <Link href="/onboarding" style={primaryCtaStyle}>Get Your Free Archetype →</Link>
            <Link href="/pricing" style={secondaryCtaStyle}>See Pricing</Link>
            {/* De-prelaunch: product is live; send visitors to account creation. */}
            <Link
              href="/signup"
              style={{ ...secondaryCtaStyle, color: '#c4b5fd' }}
            >
              Get started →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

const GOAL_EXAMPLES = [
  { category: 'Career', examples: ['Launch my business', 'Get promoted', 'Change industries'] },
  { category: 'Health', examples: ['Run a marathon', 'Sleep better', 'Reduce stress'] },
  { category: 'Relationships', examples: ['Find a partner', 'Deepen marriage', 'Build community'] },
  { category: 'Creativity', examples: ['Write a book', 'Learn an instrument', 'Start a podcast'] },
];

const pageStyle: React.CSSProperties = { background: '#060608', color: 'var(--color-bg-secondary)', minHeight: '100vh' };
const innerStyle: React.CSSProperties = { maxWidth: '900px', margin: '0 auto', padding: '5rem 2rem' };
const headerStyle: React.CSSProperties = { marginBottom: '4rem' };
const eyebrowStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a78bfa' };
const pageTitleStyle: React.CSSProperties = { margin: 0, fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', lineHeight: 1.15, letterSpacing: '-0.03em' };
const stepSectionStyle: React.CSSProperties = { marginBottom: '1rem' };
const stepHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.25rem' };
const stepNumStyle: React.CSSProperties = { fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.06em', color: 'rgba(167,139,250,0.25)', lineHeight: 1, flexShrink: 0 };
const stepTitleStyle: React.CSSProperties = { margin: 0, fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' };
const stepTimeStyle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 600, color: '#a78bfa', letterSpacing: '0', fontStyle: 'normal' };
const bodyStyle: React.CSSProperties = { margin: '0 0 1.5rem', fontSize: '1rem', lineHeight: 1.75, color: 'rgba(248,250,252,0.7)' };
const dividerStyle: React.CSSProperties = { height: '1px', background: 'rgba(255,255,255,0.08)', margin: '3.5rem 0' };
const sectionTitleStyle: React.CSSProperties = { margin: '0 0 1.5rem', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.03em' };

const goalExamplesStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' };
const goalCategoryStyle: React.CSSProperties = { padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' };
const goalCategoryLabelStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.06em', textTransform: 'uppercase' };
const goalTagsStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.4rem' };
const goalTagStyle: React.CSSProperties = { fontSize: '0.85rem', color: 'rgba(248,250,252,0.65)' };

const integrationsGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' };
const integrationCardStyle: React.CSSProperties = { padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' };
const integrationCategoryStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.06em', textTransform: 'uppercase' };
const integrationAppsStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.35rem' };
const integrationAppStyle: React.CSSProperties = { fontSize: '0.85rem', color: 'rgba(248,250,252,0.6)' };

const scenarioStyle: React.CSSProperties = { marginBottom: '2rem' };
const scenarioLabelStyle: React.CSSProperties = { margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa' };
const scenarioGoalStyle: React.CSSProperties = { margin: '0 0 1rem', fontSize: '0.85rem', color: 'rgba(248,250,252,0.45)', fontStyle: 'italic' };
const dashMockStyle: React.CSSProperties = { borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(10,10,14,0.95)', overflow: 'hidden' };
const dashMockHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' };
const dashDotStyle = (c: string): React.CSSProperties => ({ width: '9px', height: '9px', borderRadius: '50%', background: c, opacity: 0.6 });
const dashMockTitleStyle: React.CSSProperties = { marginLeft: '0.4rem', fontSize: '0.72rem', color: 'rgba(248,250,252,0.35)', fontFamily: 'monospace' };
const dashMockBodyStyle: React.CSSProperties = { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' };
const dashRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' };
const dashLabelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'rgba(248,250,252,0.4)' };
const dashValueStyle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-bg-secondary)' };
const dashDivStyle: React.CSSProperties = { height: '1px', background: 'rgba(255,255,255,0.07)' };
const dashInsightStyle: React.CSSProperties = { margin: 0, fontSize: '0.82rem', lineHeight: 1.6, color: 'rgba(248,250,252,0.6)', fontStyle: 'italic' };
const dashNudgeStyle: React.CSSProperties = { margin: 0, fontSize: '0.8rem', color: '#4ade80', fontWeight: 600 };

const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' };
const thStyle: React.CSSProperties = { padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(248,250,252,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' };
const trEvenStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.02)' };
const tdStyle: React.CSSProperties = { padding: '0.85rem 1rem', color: 'rgba(248,250,252,0.75)', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top', lineHeight: 1.6 };

const ctaSectionStyle: React.CSSProperties = { marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.08)' };
const ctaTitleStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: '1.75rem', letterSpacing: '-0.03em' };
const ctaBodyStyle: React.CSSProperties = { margin: '0 0 1.5rem', fontSize: '1rem', color: 'rgba(248,250,252,0.55)' };
const ctaGroupStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' };
const primaryCtaStyle: React.CSSProperties = { display: 'inline-block', padding: '0.85rem 1.75rem', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)', color: '#fff', fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' };
const secondaryCtaStyle: React.CSSProperties = { display: 'inline-block', fontSize: '0.95rem', color: 'rgba(248,250,252,0.55)', textDecoration: 'none' };
