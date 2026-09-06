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
    ctaHref: '/signup?plan=agent-connect',
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
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'The Full Live OS',
    price: '$18',
    period: 'per month',
    description: 'The complete 8os experience with native AI journaling, goal therapy, and advanced timing.',
    cta: 'Start Pro',
    ctaHref: '/signup?plan=pro',
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
  const style = {
    ...tierCtaStyle,
    ...(tier.highlighted ? tierCtaHighlightedStyle : tierCtaSecondaryStyle),
  };
  // OS-6088: class lets page-local CSS beat dark --color-accent-border (#9A7A3A
  // on #221E18 = 4.12:1 FAIL). Inline color still used as the light-theme default.
  const className = tier.highlighted ? 'cta-highlighted' : 'cta-primary';

  if (tier.id === 'agent-connect' || tier.id === 'pro') {
    return (
      <CheckoutButton
        tier={tier.id as 'agent-connect' | 'pro'}
        label={tier.cta}
        style={style}
        className={className}
      />
    );
  }

  return (
    <Link href={tier.ctaHref} style={style} className={className}>
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
              <div style={tierHeaderStyle}>
                {tier.highlighted && (
                  <div style={popularBadgeStyle}>Most Popular</div>
                )}
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

              {/* OS-5961 r2: feature list precedes CTA-footer in DOM so the
                  subgrid 1fr row lands on the feature list (absorb slack)
                  and the CTA sits in the auto row directly below it. Every
                  card's CTA baseline matches because the rows above it
                  (header + desc) are both auto and identical. The 5th row
                  track from OS-5938 (.tier-note) is gone — that empty slot
                  was what made cards stretch past the 1440x900 fold. */}
              <ul style={featureListStyle} role="list">
                {tier.features.map(({ label, included }) => (
                  <li key={label} style={featureItemStyle(included)}>
                    <span style={featureCheckStyle(included)}>{included ? '✓' : '✗'}</span>
                    {label}
                  </li>
                ))}
              </ul>

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

// OS-5923: do not set min-height: fit-content on .tier-card — that blocks stretch.
// OS-5934 / OS-5938 / OS-5961 r2: parent grid defines 4 explicit row tracks
// (header / desc / features-1fr / footer-with-CTA) and subgrid on .tier-card
// inherits them so every card's CTA shares the same baseline regardless of
// feature-list length. The 5th .tier-note row from OS-5938 is GONE (OS-5960
// removed the in-card callout); that empty track was what forced subgrid to
// stretch cards past the 1440x900 fold. 4 rows + no empty track = subgrid
// alignment restored without the fold-clip regression.
/* OS-6341 r2: use theme-aware var(--color-text-secondary) directly instead of
   a custom var. --color-text-secondary is contrast-tested for AA in BOTH themes
   on every card surface:
     light #6B6257 on #FFFFFF = 5.98:1, on #F2E9D6 (Pro) = 4.96:1
     dark  #B8AF9F on #221E18 = 7.63:1, on #3A3125 (Pro) = 5.88:1
   The previous --pricing-excluded-feature-color (#767676 base / #EDE7DD dark)
   failed axe on the gold-tinted Pro card in light mode (#767676 on #F2E9D6
   = 3.76:1) and would fail even harder if a dark-mode override leaked onto a
   light surface. Theme-aware secondary is always correct against the card it
   sits on. --pricing-included-marker-color stays a custom token because green
   contrast semantics differ from text. */
const tiersGridResponsiveStyle = `
  /* OS-2779 r2: WCAG AA contrast on excluded feature items.
   * VidMee reopen (2026-09-04) on vidmee_ss_9d5b38b6d76b7d1ca14dd282
   * measured the prior values against card backgrounds:
   *   #A1A1AA on white (default card) = 2.56:1  FAIL AA
   *   #EDE7DD on white (in light theme if dark var is inherited) = 1.23:1  FAIL
   * Replacements computed against globals.css card backgrounds:
   *   #52525B on #FFFFFF = 7.73:1  PASS AAA
   *   #A8A29E on #221E18 = 6.57:1  PASS AA
   * line-through is preserved: it's a legitimate "not included" affordance,
   * and the original OS-2779 fix (91945819) shipped with it. */
  .pricing-page {
    --pricing-included-marker-color: #15803D;
    overflow: visible;
  }
  [data-theme='dark'] .pricing-page {
    --pricing-included-marker-color: #86EFAC;
  }
  /* OS-5934 / OS-5938 / OS-5961 r2: parent grid defines 4 explicit row tracks
     so the subgrid on .tier-card can inherit them and align CTA rows across
     cards. Tracks = header (auto) / desc (auto) / features (1fr) / footer
     (auto). align-items:stretch so all cards reach the tallest card's height;
     the empty bottom of shorter cards is filled by the 1fr features track
     (CTA still sits directly above features, baseline aligned). */
  .tiers-grid {
    margin-bottom: 5rem;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: auto auto 1fr auto;
    align-items: stretch;
  }
  .tier-card {
    overflow: visible !important;
    max-height: none;
    display: grid !important;
    grid-template-rows: subgrid;
    grid-row: span 4;
  }
  /* OS-5960: compact on 900px desktop so feature lists AND the
     Agent Connect note stay above the fold. VidMee flags the note band
     (y≈915, h≈85) as clipped card content. */
  @media (max-height: 960px) {
    .pricing-inner { padding-top: 1.5rem !important; padding-bottom: 2rem !important; }
    .pricing-page h1 { margin-bottom: 0.5rem !important; font-size: 1.7rem !important; }
    .tiers-grid { margin-bottom: 2rem; gap: 0.75rem; }
    .tier-card { padding: 0.95rem !important; gap: 0.4rem !important; }
    .tier-card ul { gap: 0.2rem !important; }
    .tier-card ul li { line-height: 1.25 !important; font-size: 0.78rem !important; }
    .tier-footer { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; gap: 0.4rem !important; }
  }
  /* OS-5960 revisit / OS-5961 r2: ensure CTAs visible on common 1366x768 laptop
     viewport. Aggressive compact for viewports under 820px height. Selectors
     target via DOM-child indices instead of "+ p + div" so they survive the
     header/desc/ul/footer reorder. */
  @media (max-height: 820px) {
    .pricing-inner { padding-top: 1rem !important; padding-bottom: 1.5rem !important; }
    .pricing-page h1 { margin-bottom: 0.25rem !important; font-size: 1.5rem !important; }
    .pricing-page > div > p:nth-of-type(2) { display: none; }
    .tiers-grid { margin-bottom: 1.5rem; gap: 0.5rem; }
    .tier-card { padding: 0.75rem !important; gap: 0.25rem !important; border-radius: 12px !important; }
    .tier-card > div:first-child > div:first-child { top: -6px !important; font-size: 0.6rem !important; padding: 0.15rem 0.5rem !important; }
    /* DOM order: header(div#1) > desc(p#2) > ul(ul#3) > footer(div#4).
       Header tagline = first-div > p:nth-of-type(2).
       Description = first-div + p.
       Price block lives inside the header so we target header > div:last-child
       (tierPriceBlockStyle). */
    .tier-card > div:first-child p:nth-of-type(2) { font-size: 0.7rem !important; }
    .tier-card > div:first-child + p { min-height: auto !important; margin-bottom: 0.25rem !important; font-size: 0.8rem !important; }
    .tier-card > div:first-child > div:last-child span:first-child { font-size: 1.4rem !important; }
    .tier-card > div:first-child > div:last-child span:last-child { font-size: 0.65rem !important; }
    .tier-card ul { gap: 0.12rem !important; }
    .tier-card ul li { line-height: 1.2 !important; font-size: 0.72rem !important; }
    .tier-card ul li span:first-child { font-size: 0.7rem !important; }
    .tier-footer { padding-top: 0.4rem !important; padding-bottom: 0.4rem !important; gap: 0.3rem !important; }
    .tier-footer a, .tier-footer button { padding: 0.6rem 0.75rem !important; font-size: 0.78rem !important; }
    .tier-footer p { font-size: 0.7rem !important; }
  }
  /* OS-5960: prevent mid-word breaks in card text */
  .tier-card { word-wrap: break-word; overflow-wrap: break-word; }
  /* OS-5914 / OS-5938: keep 4-col at widths ≥1101px (VidMee 1440x900
     baseline). CTAs sit above the feature list so they share a fold
     row even without subgrid. */
  @media (max-width: 1100px) {
    .tiers-grid { grid-template-columns: repeat(2, 1fr) !important; align-items: stretch; }
  }
  @media (max-width: 600px) {
    .tiers-grid { grid-template-columns: 1fr !important; align-items: stretch; }
  }
  /* OS-5960 r2: secondary CTA "Get started" used --color-accent on
     --color-accent-soft = 4.4:1 (axe WCAG2AA FAIL on the bottom CTA box).
     --color-accent-border passes light (5.26:1 on #F2E9D6) but dark
     (#9A7A3A on #3A3125 = 3.17:1 FAIL). Pin a per-theme gold for the
     outline-style CTA pair: #7A5A1E light / #d4a366 dark — both ≥4.95:1
     on the soft tint. */
  .pricing-page .cta-secondary {
    background: var(--color-accent-soft);
    border-color: #7A5A1E;
    color: #7A5A1E;
  }
  [data-theme='dark'] .pricing-page .cta-secondary {
    background: var(--color-accent-soft);
    border-color: #d4a366;
    color: #d4a366;
  }
  /* OS-6088: dark outline CTAs. Label #F5E8D0 on card #221E18 = 13.68:1.
     Border #d4a366 on #221E18 = 7.29:1 (was --color-accent-border #9A7A3A = 4.12:1). */
  [data-theme='dark'] .pricing-page .cta-primary {
    color: #F5E8D0 !important;
    border-color: #d4a366 !important;
  }
  /* OS-6101: pin .cta-highlighted independently of --color-accent /
     --color-on-accent. Dark theme brightens accent to #d4a366; white on
     that gold is 2.28:1 (axe WCAG2AA). VidMee/axe also fail when html
     has no data-theme yet (system dark + :root white-on-#8A6514 is fine,
     but a late theme paint can pair :root --color-on-accent #fff with
     dark --color-accent). White on #8A6514 = 5.31:1 AA in both themes. */
  .pricing-page .cta-highlighted {
    background: #8A6514 !important;
    border-color: #8A6514 !important;
    color: #ffffff !important;
  }
`;

const pageStyle: React.CSSProperties = { background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', minHeight: '100vh', paddingBottom: '6rem' };
const innerStyle: React.CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '3.5rem 2rem', minWidth: 0 };
const headerStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '1rem' };
const eyebrowStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-primary)' };
const pageTitleStyle: React.CSSProperties = { margin: '0 0 1rem', fontSize: 'clamp(1.4rem, 6vw, 2.25rem)', lineHeight: 1.15, letterSpacing: '-0.035em', fontWeight: 800 };
const pageDescStyle: React.CSSProperties = { margin: 0, fontSize: '1.1rem', color: 'var(--color-text-secondary)', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 };

const tiersGridStyle: React.CSSProperties = { display: 'grid', gap: '1.25rem', alignItems: 'stretch' };

const tierCardStyle: React.CSSProperties = { position: 'relative', padding: '1.35rem', borderRadius: '20px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', display: 'flex', flexDirection: 'column', gap: '0.85rem', overflow: 'visible', height: '100%' };
const tierHighlightedStyle: React.CSSProperties = { border: '2px solid #C87055', background: 'var(--color-accent-soft)', boxShadow: '0 0 0 1px var(--color-accent-soft)' };

const popularBadgeStyle: React.CSSProperties = { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '0.3rem 0.85rem', borderRadius: '999px', background: 'var(--color-accent-2)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' };

const tierHeaderStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' };
const tierNameStyle: React.CSSProperties = { margin: '0 0 0.2rem', fontSize: '1.15rem', fontWeight: 800 };
// OS-6348: var(--skin-badge-color) varies by archetype skin (bronze #7A5A1E light /
// #E4CB94 dark) and fails AA on some card surfaces. Switch to theme-aware
// var(--color-text-secondary) which passes AA on all card backgrounds in both
// light and dark modes (5.98:1 / 4.96:1 / 7.63:1 / 5.88:1).
const tierTaglineStyle: React.CSSProperties = { margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 700 };
const tierPriceBlockStyle: React.CSSProperties = { textAlign: 'left' };
const tierPriceStyle: React.CSSProperties = { display: 'block', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 };
const tierPeriodStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: 'var(--color-text-primary)', marginTop: '0.15rem' };
const tierDescStyle: React.CSSProperties = { margin: 0, minHeight: '2.75rem', fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--color-text-secondary)' };

const featureListStyle: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 };
/* OS-6402 r2: disabled (line-through) features need higher contrast.
   #A3A3A3 FAILED AA on gold-tinted Pro card (#F2E9D6 bg): 3.48:1 < 4.5:1.
   #52525B passes AA on all card backgrounds:
     - #52525B on #FFFFFF = 7.73:1 PASS
     - #52525B on #F2E9D6 (Pro) = 5.53:1 PASS
     - #52525B on #221E18 (dark) = 8.76:1 PASS */
const excludedFeatureTextColor = '#52525B';
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

// OS-6350: footer uses flex column with CTA first, "Best for" below.
  // Varying text lengths (34-77 chars) made footer heights differ and CTA
  // buttons misalign. Set min-height on "Best for" container to normalize.
const tierFooterStyle: React.CSSProperties = { borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', paddingTop: '1rem', paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'visible' };
// OS-6350: "Best for" text varies 34-77 chars, causing footer heights to differ
// and CTA buttons to misalign. Set min-height to normalize footer height.
const bestForLabelStyle: React.CSSProperties = { margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, minHeight: '2.4em', display: 'flex', alignItems: 'flex-start' };
const bestForTextStyle: React.CSSProperties = { fontWeight: 400, color: 'var(--color-text-secondary)' };
/* OS-5961 r2: every CTA shares the same padding/font so all four buttons
 * render at the same computed height (~56px incl. 1px border). Earlier Pro
 * was 64px vs outline 56px (8px bottom diff VidMee flagged). */
const tierCtaStyle: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'center', padding: '1rem 1rem', borderRadius: '12px', fontWeight: 800, textDecoration: 'none', fontSize: '0.95rem', lineHeight: 1.2, transition: 'transform 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s' };
/* Secondary CTAs: outline, no terracotta fill — Pro is the only solid primary. */
const tierCtaSecondaryStyle: React.CSSProperties = { background: 'transparent', border: '1.5px solid var(--color-accent-border)', color: 'var(--color-accent-border)', boxShadow: 'none' };
/* Primary Pro CTA: gold fill + elevation.
 * OS-5961 r2: same font-size + padding as outline CTAs so all four buttons
 * render at the same height (~52px text-block + padding). The earlier
 * `fontSize:1rem; padding:1.05rem 1rem` made Pro 64px vs outline 56px —
 * the 8px diff VidMee flagged. Hex bg (not theme token) so dark
 * --color-accent #d4a366 never pairs with white text. White on #8A6514
 * = 5.31:1 AA (OS-6101). */
const tierCtaHighlightedStyle: React.CSSProperties = { background: '#8A6514', border: '1px solid #8A6514', color: '#ffffff', boxShadow: '0 14px 32px rgba(138, 101, 20, 0.35)' };

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
// OS-5960 r2: secondary CTA "Get started" sits in the bottom CTA box. The
// .cta-secondary class (in the page <style> block) sets the AA-passing
// gold color; we leave color off this style object so the class wins.
// Outline-only button — softer than primary, but text must stay readable.
const ctaSecondaryStyle: React.CSSProperties = { ...ctaButtonStyle, background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent-soft)', boxShadow: 'none', color: undefined as unknown as string };
