import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckoutButton } from '@/components/CheckoutButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pricing: Choose Your Operating System | 8os.ai',
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
      { label: 'Basic goal tracking', included: true },
      { label: 'Goal architecture (multi-goal plans)', included: false },
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
      { label: 'Goal tracking & architecture (multi-goal plans)', included: true },
      { label: 'Calendar & task integration (full read/write)', included: true },
      { label: 'Health integration hub (Apple Health, Fitbit, Garmin, Oura)', included: true },
      { label: 'Relationship nudges', included: true },
      { label: 'Journal storage (BYO AI for interpretation)', included: true },
      { label: 'AI journaling & insights (native)', included: false },
      { label: 'Monthly personalized reports', included: false },
    ],
    bestFor: 'AI power users, privacy-focused, developers with existing AI subscriptions',
    note: 'Connect Claude, GPT, or any local LLM via API. You bring the AI tokens, we provide the structured data and infrastructure.',
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
      { label: 'AI goal therapy ("You\'re off track, here\'s why")', included: true },
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
  { feature: 'Goal Tracking', free: 'Basic', agent: true, pro: true, enterprise: true },
  { feature: 'Goal Architecture', free: false, agent: true, pro: true, enterprise: true },
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
  if (value === false) return <span style={crossStyle}>-</span>;
  return <span style={partialStyle}>{value}</span>;
}

function TierCta({ tier }: { tier: (typeof TIERS)[number] }) {
  const style = { ...tierCtaStyle, ...tierCtaVisibleStyle, ...(tier.highlighted ? tierCtaHighlightedStyle : {}) };

  if (tier.id === 'agent-connect' || tier.id === 'pro') {
    return (
      <CheckoutButton
        tier={tier.id as 'agent-connect' | 'pro'}
        label={tier.cta}
        style={style}
      />
    );
  }

  return (
    <Link href={tier.ctaHref} style={style}>
      {tier.cta}
    </Link>
  );
}

export default function PricingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: tiersGridResponsiveStyle }} />
    <main className="pricing-page" style={pageStyle} aria-label="Pricing tiers">
      <div className="pricing-inner" style={innerStyle}>
        <div style={headerStyle}>
          <p style={eyebrowStyle}>Pricing</p>
          <h1 style={pageTitleStyle}>Choose Your Operating System Tier</h1>
          <p style={pageDescStyle}>
            Start free with basic goal tracking. Upgrade when you need architecture, AI journaling, and timing. Every tier builds on the one before it.
          </p>
        </div>

        {/* Tier cards */}
        <div className="tiers-grid" style={tiersGridStyle}>
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              id={`tier-${tier.id}`}
              className="tier-card"
              style={{ ...tierCardStyle, ...(tier.highlighted ? tierHighlightedStyle : {}) }}
            >
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

              <ul style={featureListStyle} role="list">
                {tier.features.map(({ label, included }) => (
                  <li key={label} style={featureItemStyle(included)}>
                    <span style={featureCheckStyle(included)}>{included ? '✓' : '✗'}</span>
                    {label}
                  </li>
                ))}
              </ul>

              {tier.note && (
                <div style={tierNoteStyle}>
                  <p style={tierNoteTextStyle}>{tier.note}</p>
                </div>
              )}

              <div className="tier-footer" style={tierFooterStyle}>
                <TierCta tier={tier} />
                <p style={bestForLabelStyle}>Best for: <span style={bestForTextStyle}>{tier.bestFor}</span></p>
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
                  <th style={{ ...thStyle, color: 'var(--color-accent)', width: '17%' }}>Pro<br /><span style={thPriceStyle}>$18</span></th>
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
            All plans can be cancelled anytime. Annual billing available (2 months free). Enterprise pricing is custom,
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
              href="/onboarding"
              style={{
                ...ctaButtonStyle,
                background: 'var(--color-accent-soft)',
                border: '1px solid var(--color-accent-soft)',
                boxShadow: 'none',
                color: 'var(--color-accent)',
              }}
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}

// OS-5923: do not set height:auto !important on .tier-card — that overrides
// grid stretch, so cards size to their own content and CTAs misalign.
// Keep overflow visible (no clip). Move Agent Connect note below the CTA
// so the footer slot stays aligned. Tighten hero padding on short desktops.
const tiersGridResponsiveStyle = `
  .pricing-page {
    --pricing-excluded-feature-color: #A1A1AA;
    --pricing-included-marker-color: #15803D;
    overflow: visible;
  }
  [data-theme='light'] .pricing-page {
    --pricing-excluded-feature-color: #6B6257;
  }
  [data-theme='dark'] .pricing-page {
    --pricing-excluded-feature-color: #EDE7DD;
    --pricing-included-marker-color: #86EFAC;
  }
  /* OS-5961: equal-height cards + footer marginTop:auto is the only
     mechanism that truly aligns CTAs — bottom-anchored footers share a
     baseline row by construction. align-items:start can never align CTAs
     because each card hugs its own height, leaving no free space for
     marginTop:auto to absorb (footer rides each card's feature-list
     length). The Agent Connect note renders just above the footer (after
     the feature list) so the footer is the last element and truly
     bottom-anchors; the note lands mid-card, above the CTA row. */
  .tiers-grid { margin-bottom: 5rem; grid-template-columns: repeat(4, 1fr); align-items: stretch; }
  .tier-card {
    overflow: visible !important;
    min-height: fit-content;
    max-height: none;
  }
  /* OS-5938 / OS-5960: compact on 900px desktop so feature lists AND the
     Agent Connect note stay above the fold. VidMee flags the note band
     (y≈915, h≈85) as clipped card content. */
  @media (max-height: 960px) {
    .pricing-inner { padding-top: 1.5rem !important; padding-bottom: 2rem !important; }
    .pricing-page h1 { margin-bottom: 0.5rem !important; font-size: 1.7rem !important; }
    .tiers-grid { margin-bottom: 2rem; gap: 0.75rem; }
    .tier-card { padding: 0.95rem !important; gap: 0.5rem !important; }
    .tier-card ul { gap: 0.28rem !important; }
    .tier-card ul li { line-height: 1.3 !important; font-size: 0.8rem !important; }
    .tier-footer { padding-top: 0.55rem !important; padding-bottom: 0.55rem !important; gap: 0.5rem !important; }
  }
  /* OS-5961: pin every tier footer to the same offset from the card top so
     all CTAs share one baseline row. Cards keep hugging content
     (align-items:start) so the Agent Connect note stays above the fold
     (OS-5960), but the footer no longer rides each card's feature-list
     length. Best-For line flows after the CTA and may wrap freely. */
  .tier-footer { margin-top: auto; }
  .tiers-grid .tier-card { padding-bottom: 0.95rem; }
  /* OS-5961: 2-col rows share a baseline pair (rows 1-2 / 3-4); 1-col
     stacks are inherently aligned. */
  @media (max-width: 1100px) {
    .tiers-grid { grid-template-columns: repeat(2, 1fr) !important; align-items: stretch; }
  }
  @media (max-width: 600px) {
    .tiers-grid { grid-template-columns: 1fr !important; align-items: stretch; }
  }
`;

const pageStyle: React.CSSProperties = { background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', minHeight: '100vh', paddingBottom: '6rem' };
const innerStyle: React.CSSProperties = { maxWidth: '1280px', margin: '0 auto', padding: '3.5rem 2rem', minWidth: 0 };
const headerStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '2.25rem' };
const eyebrowStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-primary)' };
const pageTitleStyle: React.CSSProperties = { margin: '0 0 1rem', fontSize: 'clamp(1.4rem, 6vw, 2.25rem)', lineHeight: 1.15, letterSpacing: '-0.035em', fontWeight: 800 };
const pageDescStyle: React.CSSProperties = { margin: 0, fontSize: '1.1rem', color: 'var(--color-text-secondary)', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 };

const tiersGridStyle: React.CSSProperties = { display: 'grid', gap: '1.5rem' };

const tierCardStyle: React.CSSProperties = { position: 'relative', padding: '1.35rem', borderRadius: '20px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', display: 'flex', flexDirection: 'column', gap: '0.85rem', overflow: 'visible', minHeight: 'fit-content' };
const tierHighlightedStyle: React.CSSProperties = { border: '2px solid #C87055', background: 'var(--color-accent-soft)', boxShadow: '0 0 0 1px var(--color-accent-soft)' };

const popularBadgeStyle: React.CSSProperties = { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '0.3rem 0.85rem', borderRadius: '999px', background: 'var(--color-accent-2)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' };

const tierHeaderStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' };
const tierNameStyle: React.CSSProperties = { margin: '0 0 0.2rem', fontSize: '1.15rem', fontWeight: 800 };
const tierTaglineStyle: React.CSSProperties = { margin: 0, fontSize: '0.8rem', color: 'var(--skin-badge-color)', fontWeight: 700 };
const tierPriceBlockStyle: React.CSSProperties = { textAlign: 'left' };
const tierPriceStyle: React.CSSProperties = { display: 'block', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 };
const tierPeriodStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: 'var(--color-text-primary)', marginTop: '0.15rem' };
const tierDescStyle: React.CSSProperties = { margin: 0, minHeight: '2.75rem', fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--color-text-secondary)' };
const tierNoteStyle: React.CSSProperties = { padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' };
const tierNoteTextStyle: React.CSSProperties = { margin: 0, fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', fontStyle: 'italic' };

// OS-5961: no flex:1 here. flex:1 grew the UL to fill the card height
// under stretch, so each footer (and CTA) was pushed down by the UL-height
// difference — the 321px CTA spread QA measured. With natural-height ULs
// every footer sits at a fixed offset below its feature list, so all CTAs
// share one baseline row while cards hug content (align-items:start).
const featureListStyle: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' };
const excludedFeatureTextColor = 'var(--pricing-excluded-feature-color)';
const featureItemStyle = (included: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.6rem',
  fontSize: '0.85rem',
  lineHeight: 1.5,
  color: included ? 'var(--color-text-secondary)' : excludedFeatureTextColor,
  textDecoration: included ? 'none' : 'line-through',
  textDecorationThickness: included ? undefined : '1px',
});
const featureCheckStyle = (included: boolean): React.CSSProperties => ({
  flexShrink: 0,
  fontSize: '0.8rem',
  fontWeight: 700,
  color: included ? 'var(--pricing-included-marker-color)' : excludedFeatureTextColor,
  marginTop: '0.1rem',
});

// OS-5961: CTA renders LAST in the footer so its top edge sits at a fixed
// offset below the feature list on every card — CTAs share a baseline row
// even while cards hug content (align-items:start). marginTop:auto cannot
// align hugged cards because each card is exactly its own content height.
// The "Best for" line flows after the CTA and may wrap without moving it.
const tierFooterStyle: React.CSSProperties = { borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'visible' };
// OS-5961: reserve the two-line Best-For slot (a wrapped line is ~45px at
// this size) so the CTA above it sits at a fixed offset from the feature
// list on every card — regardless of how the Best-For text wraps. Without
// this, a one-line Best-For (Free) shortens the footer and pushes its CTA
// up ~15px vs the two-line cards.
const bestForLabelStyle: React.CSSProperties = { margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, minHeight: '45px' };
const bestForTextStyle: React.CSSProperties = { fontWeight: 400, color: 'var(--color-text-secondary)' };
const tierCtaStyle: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'center', padding: '0.9rem 1rem', borderRadius: '12px', background: 'var(--color-accent)', border: '1px solid var(--color-accent)', color: 'var(--skin-button-primary-text)', fontWeight: 800, textDecoration: 'none', fontSize: '0.92rem', boxShadow: '0 10px 24px rgba(34, 31, 26, 0.12)', transition: 'transform 0.2s, background 0.2s, border-color 0.2s' };
const tierCtaVisibleStyle: React.CSSProperties = { background: 'var(--color-accent-2)', border: '1px solid var(--color-accent-2)', color: '#fff' };
const tierCtaHighlightedStyle: React.CSSProperties = { background: 'var(--color-accent-2)', border: '1px solid var(--color-accent-2)', color: '#fff', boxShadow: '0 12px 28px rgba(34, 31, 26, 0.18)' };

const tableSection: React.CSSProperties = { marginBottom: '4rem' };
const sectionTitleStyle: React.CSSProperties = { margin: '0 0 1.5rem', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.03em' };
const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', maxWidth: '100%', borderRadius: '16px', border: '1px solid var(--color-border)' };
const tableStyle: React.CSSProperties = { width: '100%', minWidth: '640px', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.88rem' };
const tableScrollHintStyle: React.CSSProperties = { display: 'none', margin: '0.75rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-secondary)', textAlign: 'center' };
const thStyle: React.CSSProperties = { padding: '1rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-card)' };
const thPriceStyle: React.CSSProperties = { fontWeight: 400, fontSize: '0.75rem', color: 'var(--color-text-secondary)' };
const trEvenStyle: React.CSSProperties = { background: 'var(--color-bg-card)' };
const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' };
const checkStyle: React.CSSProperties = { color: 'var(--pricing-included-marker-color)', fontWeight: 700, fontSize: '1rem' };
const crossStyle: React.CSSProperties = { color: excludedFeatureTextColor, fontSize: '0.9rem' };
const partialStyle: React.CSSProperties = { color: 'var(--color-accent)', fontSize: '0.82rem', fontWeight: 600 };

const faqStyle: React.CSSProperties = { padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', marginBottom: '3rem' };
const faqTitleStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: '1.1rem', fontWeight: 700 };
const faqBodyStyle: React.CSSProperties = { margin: '0 0 1rem', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' };
const faqLinkStyle: React.CSSProperties = { display: 'inline-block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none' };

const ctaBoxStyle: React.CSSProperties = { textAlign: 'center', padding: '4rem 2rem', borderRadius: '24px', border: '1px solid var(--color-accent-soft)', background: 'var(--color-accent-soft)' };
const ctaTitleStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '-0.04em' };
const ctaDescStyle: React.CSSProperties = { margin: '0 0 2rem', fontSize: '1rem', color: 'var(--color-text-secondary)' };
const ctaButtonStyle: React.CSSProperties = { display: 'inline-block', padding: '1rem 2rem', borderRadius: '12px', background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent) 100%)', color: '#fff', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 12px 32px var(--color-accent-soft)' };
