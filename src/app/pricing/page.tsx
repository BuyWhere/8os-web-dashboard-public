import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckoutButton } from '@/components/CheckoutButton';

export const metadata: Metadata = {
  title: 'Pricing — Choose Your Operating System | 8os.ai',
  description:
    'Start free. Upgrade to Pro for AI journaling, advanced timing, and monthly reports. Agent Connect tier for BYO-AI users.',
  openGraph: {
    title: 'Choose Your 8os Operating System Tier',
    description:
      'Start free. Upgrade to Pro for AI journaling, advanced timing, and monthly reports. Agent Connect tier for BYO-AI users.',
    type: 'website',
  },
};

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'The Gateway',
    price: '$0',
    period: 'forever',
    description: 'Discover your archetype and explore your blueprint. No credit card required.',
    cta: 'Get Started Free',
    ctaHref: '/onboarding',
    highlighted: false,
    features: [
      { label: 'Basic archetype card (Western + BaZi synthesis)', included: true },
      { label: 'Static birth chart view', included: true },
      { label: '1 archetype deep-dive article', included: true },
      { label: 'Basic task management', included: true },
      { label: 'Calendar integration (view-only)', included: true },
      { label: 'Community forum access', included: true },
      { label: 'Goal tracking & architecture', included: false },
      { label: 'AI journaling', included: false },
      { label: 'Health/progress integrations', included: false },
      { label: 'Timing recommendations', included: false },
    ],
    bestFor: 'Curious explorers, first-time users',
  },
  {
    id: 'agent-connect',
    name: 'Agent Connect',
    tagline: 'Bring Your Own Intelligence',
    price: '$9.99',
    period: 'per month',
    description: 'Full dashboard + goal tracking. Connect your own AI agent for journaling and insights.',
    cta: 'Start Agent Connect',
    ctaHref: '/onboarding',
    highlighted: false,
    features: [
      { label: 'Everything in Free', included: true },
      { label: 'Full dashboard (all archetype data, transit tracking, luck pillar)', included: true },
      { label: 'Goal tracking & architecture', included: true },
      { label: 'Calendar & task integration (full read/write)', included: true },
      { label: 'Health integration hub (Apple Health, Fitbit, Garmin, Oura)', included: true },
      { label: 'Relationship nudges', included: true },
      { label: 'Journal storage (BYO AI for interpretation)', included: true },
      { label: 'AI journaling & insights (native)', included: false },
      { label: 'Monthly personalized reports', included: false },
    ],
    bestFor: 'AI power users, privacy-focused, developers with existing AI subscriptions',
    note: 'Connect Claude, GPT, or any local LLM via API. You bring the AI tokens — we provide the structured data and infrastructure.',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'The Full Live OS',
    price: '$18',
    period: 'per month',
    description: 'The complete 8os experience with native AI journaling, goal therapy, and advanced timing.',
    cta: 'Start Pro',
    ctaHref: '/onboarding',
    highlighted: true,
    features: [
      { label: 'Everything in Agent Connect', included: true },
      { label: 'AI journaling & reflection (daily prompts, mood tracking)', included: true },
      { label: 'AI goal therapy ("You\'re off track — here\'s why")', included: true },
      { label: 'AI interpretation of health trends & patterns', included: true },
      { label: 'Advanced timing engine (optimal windows for goal types)', included: true },
      { label: 'Monthly personalized report (PDF + summary)', included: true },
      { label: 'Priority support', included: true },
      { label: '500 AI calls/month included', included: true },
    ],
    bestFor: 'Active goal-achievers, self-improvement enthusiasts, those without their own AI agent',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'The Organization OS',
    price: 'Custom',
    period: 'contact us',
    description: 'Team compatibility mapping, organizational timing, white-label, and dedicated support.',
    cta: 'Contact Us',
    ctaHref: '/contact',
    highlighted: false,
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Team compatibility mapping', included: true },
      { label: 'Organizational timing', included: true },
      { label: 'Full API access', included: true },
      { label: 'White-label options', included: true },
      { label: 'Dedicated account manager', included: true },
      { label: 'Custom archetype development', included: true },
    ],
    bestFor: 'Executive teams, HR departments, consulting firms, investment groups',
  },
];

const COMPARISON_FEATURES = [
  { feature: 'Archetype Card', free: true, agent: true, pro: true, enterprise: true },
  { feature: 'Static Birth Chart', free: true, agent: true, pro: true, enterprise: true },
  { feature: 'Task Management', free: true, agent: true, pro: true, enterprise: true },
  { feature: 'Calendar View', free: true, agent: true, pro: true, enterprise: true },
  { feature: 'Goal Tracking', free: false, agent: true, pro: true, enterprise: true },
  { feature: 'Health Integration', free: false, agent: 'Display', pro: 'Full AI', enterprise: 'Full AI' },
  { feature: 'AI Journaling', free: false, agent: 'BYO AI', pro: true, enterprise: true },
  { feature: 'AI Interpretation', free: false, agent: 'BYO AI', pro: true, enterprise: true },
  { feature: 'Relationship Nudges', free: false, agent: true, pro: true, enterprise: true },
  { feature: 'Timing Engine', free: false, agent: 'Basic', pro: 'Advanced', enterprise: 'Advanced' },
  { feature: 'Monthly Reports', free: false, agent: false, pro: true, enterprise: true },
  { feature: 'API Access', free: false, agent: false, pro: 'Limited', enterprise: 'Full' },
  { feature: 'Team Features', free: false, agent: false, pro: false, enterprise: true },
  { feature: 'White Label', free: false, agent: false, pro: false, enterprise: true },
];

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) return <span style={checkStyle}>✓</span>;
  if (value === false) return <span style={crossStyle}>—</span>;
  return <span style={partialStyle}>{value}</span>;
}

export default function PricingPage() {
  return (
    <main style={pageStyle} aria-label="Pricing tiers">
      <div style={innerStyle}>
        <div style={headerStyle}>
          <p style={eyebrowStyle}>Pricing</p>
          <h1 style={pageTitleStyle}>Choose Your Operating System Tier</h1>
          <p style={pageDescStyle}>
            Start free. Upgrade when your goals need more. Every tier builds on the one before it.
          </p>
        </div>

        {/* Tier cards */}
        <div style={tiersGridStyle}>
          {TIERS.map((tier) => (
            <div key={tier.id} style={{ ...tierCardStyle, ...(tier.highlighted ? tierHighlightedStyle : {}) }}>
              {tier.highlighted && (
                <div style={popularBadgeStyle}>Most Popular</div>
              )}
              <div style={tierHeaderStyle}>
                <div>
                  <p style={tierNameStyle}>{tier.name}</p>
                  <p style={tierTaglineStyle}>{tier.tagline}</p>
                </div>
                <div style={tierPriceBlockStyle}>
                  <span style={tierPriceStyle}>{tier.price}</span>
                  <span style={tierPeriodStyle}>{tier.period}</span>
                </div>
              </div>

              <p style={tierDescStyle}>{tier.description}</p>

              {tier.note && (
                <div style={tierNoteStyle}>
                  <p style={tierNoteTextStyle}>{tier.note}</p>
                </div>
              )}

              <ul style={featureListStyle} role="list">
                {tier.features.map(({ label, included }) => (
                  <li key={label} style={featureItemStyle(included)}>
                    <span style={featureCheckStyle(included)}>{included ? '✓' : '✗'}</span>
                    {label}
                  </li>
                ))}
              </ul>

              <div style={tierFooterStyle}>
                <p style={bestForLabelStyle}>Best for: <span style={bestForTextStyle}>{tier.bestFor}</span></p>
                {tier.id === 'agent-connect' || tier.id === 'pro' ? (
                  <CheckoutButton
                    tier={tier.id as 'agent-connect' | 'pro'}
                    label={tier.cta}
                    style={{ ...tierCtaStyle, ...(tier.highlighted ? tierCtaHighlightedStyle : {}) }}
                  />
                ) : (
                  <Link
                    href={tier.ctaHref}
                    style={{ ...tierCtaStyle, ...(tier.highlighted ? tierCtaHighlightedStyle : {}) }}
                  >
                    {tier.cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div style={tableSection}>
          <h2 style={sectionTitleStyle}>Full Feature Comparison</h2>
          <div style={tableWrapStyle} role="region" aria-label="Feature comparison table">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left', width: '32%' }}>Feature</th>
                  <th style={{ ...thStyle, width: '17%' }}>Free</th>
                  <th style={{ ...thStyle, width: '17%' }}>Agent Connect<br /><span style={thPriceStyle}>$9.99</span></th>
                  <th style={{ ...thStyle, color: '#a78bfa', width: '17%' }}>Pro<br /><span style={thPriceStyle}>$18</span></th>
                  <th style={{ ...thStyle, width: '17%' }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map(({ feature, free, agent, pro, enterprise }, i) => (
                  <tr key={feature} style={i % 2 === 0 ? trEvenStyle : {}}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{feature}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><FeatureValue value={free} /></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><FeatureValue value={agent} /></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><FeatureValue value={pro} /></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><FeatureValue value={enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-scroll-hint" style={tableScrollHintStyle}>Swipe horizontally on mobile to compare all tiers.</p>
        </div>

        {/* FAQ note */}
        <div style={faqStyle}>
          <h3 style={faqTitleStyle}>Questions?</h3>
          <p style={faqBodyStyle}>
            All plans can be cancelled anytime. Annual billing available (2 months free). Enterprise pricing is custom —
            contact us to discuss your team&apos;s needs.
          </p>
          <Link href="/contact" style={faqLinkStyle}>Contact us →</Link>
        </div>

        {/* CTA */}
        <div style={ctaBoxStyle}>
          <h2 style={ctaTitleStyle}>Start for free today</h2>
          <p style={ctaDescStyle}>30 seconds. No credit card. Your archetype is waiting.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/onboarding" style={ctaButtonStyle}>Get Your Free Archetype</Link>
            {/* De-prelaunch: product is live; secondary CTA sends high-intent
                pricing visitors straight to account creation. */}
            <Link
              href="/signup"
              style={{
                ...ctaButtonStyle,
                background: 'rgba(118, 75, 162, 0.15)',
                border: '1px solid rgba(118, 75, 162, 0.5)',
                boxShadow: 'none',
                color: '#c4b5fd',
              }}
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = { background: '#060608', color: '#f8fafc', minHeight: '100vh' };
const innerStyle: React.CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '5rem 2rem', minWidth: 0 };
const headerStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '4rem' };
const eyebrowStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a78bfa' };
const pageTitleStyle: React.CSSProperties = { margin: '0 0 1rem', fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.1, letterSpacing: '-0.04em' };
const pageDescStyle: React.CSSProperties = { margin: 0, fontSize: '1.1rem', color: 'rgba(248,250,252,0.6)', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 };

const tiersGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '5rem', alignItems: 'start' };

const tierCardStyle: React.CSSProperties = { position: 'relative', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '1.25rem' };
const tierHighlightedStyle: React.CSSProperties = { border: '1px solid rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.07)', boxShadow: '0 0 0 1px rgba(124,58,237,0.2)' };

const popularBadgeStyle: React.CSSProperties = { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '0.3rem 0.85rem', borderRadius: '999px', background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' };

const tierHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' };
const tierNameStyle: React.CSSProperties = { margin: '0 0 0.2rem', fontSize: '1.15rem', fontWeight: 800 };
const tierTaglineStyle: React.CSSProperties = { margin: 0, fontSize: '0.8rem', color: '#a78bfa', fontWeight: 600 };
const tierPriceBlockStyle: React.CSSProperties = { textAlign: 'right', flexShrink: 0 };
const tierPriceStyle: React.CSSProperties = { display: 'block', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 };
const tierPeriodStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: 'rgba(248,250,252,0.4)', marginTop: '0.15rem' };
const tierDescStyle: React.CSSProperties = { margin: 0, fontSize: '0.9rem', lineHeight: 1.65, color: 'rgba(248,250,252,0.6)' };
const tierNoteStyle: React.CSSProperties = { padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' };
const tierNoteTextStyle: React.CSSProperties = { margin: 0, fontSize: '0.82rem', lineHeight: 1.6, color: 'rgba(248,250,252,0.6)', fontStyle: 'italic' };

const featureListStyle: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 };
const featureItemStyle = (included: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem', lineHeight: 1.5, color: included ? 'rgba(248,250,252,0.8)' : 'rgba(248,250,252,0.3)' });
const featureCheckStyle = (included: boolean): React.CSSProperties => ({ flexShrink: 0, fontSize: '0.8rem', fontWeight: 700, color: included ? '#4ade80' : 'rgba(248,250,252,0.2)', marginTop: '0.1rem' });

const tierFooterStyle: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' };
const bestForLabelStyle: React.CSSProperties = { margin: 0, fontSize: '0.78rem', color: 'rgba(248,250,252,0.35)', fontWeight: 600 };
const bestForTextStyle: React.CSSProperties = { fontWeight: 400, color: 'rgba(248,250,252,0.5)' };
const tierCtaStyle: React.CSSProperties = { display: 'block', textAlign: 'center', padding: '0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' };
const tierCtaHighlightedStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)', border: 'none', boxShadow: '0 6px 20px rgba(124,58,237,0.4)' };

const tableSection: React.CSSProperties = { marginBottom: '4rem' };
const sectionTitleStyle: React.CSSProperties = { margin: '0 0 1.5rem', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.03em' };
const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', maxWidth: '100%', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' };
const tableStyle: React.CSSProperties = { width: '100%', minWidth: '640px', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.88rem' };
const tableScrollHintStyle: React.CSSProperties = { display: 'none', margin: '0.75rem 0 0', fontSize: '0.78rem', color: 'rgba(248,250,252,0.4)', textAlign: 'center' };
const thStyle: React.CSSProperties = { padding: '1rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'rgba(248,250,252,0.45)', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' };
const thPriceStyle: React.CSSProperties = { fontWeight: 400, fontSize: '0.75rem', color: 'rgba(248,250,252,0.3)' };
const trEvenStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.02)' };
const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem', color: 'rgba(248,250,252,0.7)', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const checkStyle: React.CSSProperties = { color: '#4ade80', fontWeight: 700, fontSize: '1rem' };
const crossStyle: React.CSSProperties = { color: 'rgba(248,250,252,0.2)', fontSize: '0.9rem' };
const partialStyle: React.CSSProperties = { color: '#a78bfa', fontSize: '0.82rem', fontWeight: 600 };

const faqStyle: React.CSSProperties = { padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', marginBottom: '3rem' };
const faqTitleStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: '1.1rem', fontWeight: 700 };
const faqBodyStyle: React.CSSProperties = { margin: '0 0 1rem', fontSize: '0.9rem', lineHeight: 1.7, color: 'rgba(248,250,252,0.6)' };
const faqLinkStyle: React.CSSProperties = { display: 'inline-block', fontSize: '0.9rem', fontWeight: 700, color: '#a78bfa', textDecoration: 'none' };

const ctaBoxStyle: React.CSSProperties = { textAlign: 'center', padding: '4rem 2rem', borderRadius: '24px', border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.06)' };
const ctaTitleStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '-0.04em' };
const ctaDescStyle: React.CSSProperties = { margin: '0 0 2rem', fontSize: '1rem', color: 'rgba(248,250,252,0.6)' };
const ctaButtonStyle: React.CSSProperties = { display: 'inline-block', padding: '1rem 2rem', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)', color: '#fff', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 12px 32px rgba(124,58,237,0.45)' };
