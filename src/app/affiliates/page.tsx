import type { Metadata } from 'next'
import Link from 'next/link'
import { AffiliateForm } from '@/components/affiliates/AffiliateForm'

export const metadata: Metadata = {
  title: 'Affiliate Program — Earn Commission Introducing 8os.ai | 8os.ai',
  description:
    'Join the 8os.ai Affiliate Program and earn up to $297 per conversion. Promote AI-powered life operating systems built on BaZi and Western astrology.',
  openGraph: {
    title: '8os.ai Affiliate Program — Earn Up to $297 per Conversion',
    description:
      'Join the 8os.ai Affiliate Program and earn up to $297 per conversion. 20–25% recurring commission.',
    type: 'website',
  },
}

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Sign up',
    desc: 'Apply for the affiliate program — approval within 24 hours.',
  },
  {
    step: '02',
    title: 'Get your link',
    desc: 'Receive a unique affiliate link and access to your affiliate dashboard.',
  },
  {
    step: '03',
    title: 'Share with your audience',
    desc: 'Post on social, in your newsletter, or recommend in content.',
  },
  {
    step: '04',
    title: 'Earn commission',
    desc: 'Earn 20–25% on every paying conversion, every month.',
  },
]

const COMMISSION_TIERS = [
  {
    name: 'Pro',
    price: '$29/mo',
    firstYear: '20%',
    firstYearAmount: '$58.80',
    renewal: '10%',
    highlighted: false,
  },
  {
    name: 'Agent Connect',
    price: '$99/mo',
    firstYear: '25%',
    firstYearAmount: '$297',
    renewal: '15%',
    highlighted: true,
  },
]

const WHO_SHOULD_JOIN = [
  'Astrology content creators and communities',
  'Productivity and self-improvement influencers',
  'Wellness coaches and practitioners',
  'Tech and AI early-adopter audiences',
  'Any content creator whose audience values personal development and ancient wisdom',
]

const WHAT_YOU_GET = [
  { icon: '📝', title: 'Pre-made swipe copy', desc: 'Social posts, email templates, story scripts' },
  { icon: '🎨', title: 'Custom graphics', desc: 'Designed assets you can use immediately' },
  { icon: '📊', title: 'Affiliate dashboard', desc: 'Track clicks, conversions, and earnings in real time' },
  { icon: '📧', title: 'Monthly newsletter', desc: 'New content, tips, and program updates' },
  { icon: '💬', title: 'Dedicated support', desc: 'Direct line to our team for creative questions' },
]

const FAQS = [
  {
    q: 'How long does approval take?',
    a: 'Usually within 24 hours. Apply below and we\'ll be in touch.',
  },
  {
    q: 'When do I get paid?',
    a: 'Monthly, by the 15th of the following month (e.g., June earnings paid July 15).',
  },
  {
    q: 'What\'s the attribution window?',
    a: '30 days — anyone who clicks your link and converts within 30 days is credited to you.',
  },
  {
    q: 'Is there a minimum payout?',
    a: '$50 minimum. Payments below $50 roll over to the next month.',
  },
  {
    q: 'Do I need a tax form?',
    a: 'Yes — we use Stripe Connect for payouts. US affiliates will receive a 1099 at $600+ annual earnings. International affiliates will receive appropriate tax documentation for their region.',
  },
  {
    q: 'Can I promote 8os.ai on paid ads?',
    a: 'No — paid search (Google Ads, Bing Ads, etc.) is not permitted. All other promotional methods are welcome.',
  },
]

export default function AffiliatesPage() {
  return (
    <div style={pageStyle}>
      {/* Hero */}
      <section style={heroStyle}>
        <div style={containerStyle}>
          <div style={heroContentStyle}>
            <p style={eyebrowStyle}>Affiliate Program</p>
            <h1 style={heroTitleStyle}>
              Earn commission while helping people<br />discover their archetype.
            </h1>
            <p style={heroSubtitleStyle}>
              Join the 8os.ai Affiliate Program and earn up to{' '}
              <strong style={{ color: '#fff' }}>$297 per conversion</strong> introducing your audience
              to AI-powered life operating systems built on BaZi + Western astrology.
            </p>
            <div style={heroCtaStyle}>
              <a href="#apply" style={primaryBtnStyle}>Join the Program →</a>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={sectionStyle}>
        <div style={containerStyle}>
          <h2 style={sectionTitleStyle}>How It Works</h2>
          <div style={stepsGridStyle}>
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} style={stepCardStyle}>
                <div style={stepNumStyle}>{step}</div>
                <h3 style={stepTitleStyle}>{title}</h3>
                <p style={stepDescStyle}>{desc}</p>
              </div>
            ))}
          </div>
          <div style={metaRowStyle}>
            <span style={metaBadgeStyle}>🍪 Cookie window: 30 days</span>
            <span style={metaBadgeStyle}>💰 Payout schedule: Monthly via Stripe or PayPal</span>
          </div>
        </div>
      </section>

      {/* Commission Table */}
      <section style={{ ...sectionStyle, background: 'var(--color-bg-secondary)' }}>
        <div style={containerStyle}>
          <h2 style={sectionTitleStyle}>Commission Structure</h2>
          <div style={commissionTableStyle}>
            <div style={tableHeaderStyle}>
              <span>Tier</span>
              <span>Monthly Price</span>
              <span>First-Year Commission</span>
              <span>Renewal Commission</span>
            </div>
            {COMMISSION_TIERS.map((tier) => (
              <div key={tier.name} style={{ ...tableRowStyle, border: tier.highlighted ? '1px solid var(--color-accent)' : undefined }}>
                <div style={tableCellStyle}>
                  <span style={{ fontWeight: 600, color: tier.highlighted ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                    {tier.name}
                  </span>
                  {tier.highlighted && <span style={recommendedBadgeStyle}>Recommended</span>}
                </div>
                <div style={tableCellStyle}>{tier.price}</div>
                <div style={tableCellStyle}>
                  <strong style={{ color: tier.highlighted ? 'var(--color-accent)' : '#fff' }}>
                    {tier.firstYear}
                  </strong>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}> ({tier.firstYearAmount}/conversion)</span>
                </div>
                <div style={tableCellStyle}>{tier.renewal} ongoing</div>
              </div>
            ))}
          </div>
          <p style={exampleStyle}>
            <strong>Example:</strong> Refer 3 Agent Connect subscribers per month → <strong style={{ color: '#fff' }}>$891/month</strong> in commissions.
          </p>
        </div>
      </section>

      {/* Who Should Join */}
      <section style={sectionStyle}>
        <div style={containerStyle}>
          <h2 style={sectionTitleStyle}>Who Should Join?</h2>
          <div style={whoGridStyle}>
            {WHO_SHOULD_JOIN.map((item) => (
              <div key={item} style={whoItemStyle}>
                <span style={{ color: 'var(--color-accent)' }}>✦</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section style={{ ...sectionStyle, background: 'var(--color-bg-secondary)' }}>
        <div style={containerStyle}>
          <h2 style={sectionTitleStyle}>We Give You Everything You Need</h2>
          <div style={perksGridStyle}>
            {WHAT_YOU_GET.map(({ icon, title, desc }) => (
              <div key={title} style={perkCardStyle}>
                <div style={perkIconStyle}>{icon}</div>
                <h3 style={perkTitleStyle}>{title}</h3>
                <p style={perkDescStyle}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ ...sectionStyle, background: 'var(--color-bg-secondary)' }}>
        <div style={containerStyle}>
          <h2 style={sectionTitleStyle}>Frequently Asked Questions</h2>
          <div style={faqGridStyle}>
            {FAQS.map(({ q, a }) => (
              <div key={q} style={faqItemStyle}>
                <h3 style={faqQuestionStyle}>{q}</h3>
                <p style={faqAnswerStyle}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply CTA + Form */}
      <section id="apply" style={{ ...sectionStyle }}>
        <div style={containerStyle}>
          <div style={applyLayoutStyle}>
            <div style={applyLeftStyle}>
              <h2 style={sectionTitleStyle}>Ready to Join?</h2>
              <p style={applySubtitleStyle}>
                Apply now — we review within 24 hours and you&apos;ll hear from us at{' '}
                <a href="mailto:affiliates@8os.ai" style={{ color: 'var(--color-accent)' }}>
                  affiliates@8os.ai
                </a>
                .
              </p>
              <div style={applyStepsStyle}>
                {[
                  { n: '1', t: 'Fill out the form' },
                  { n: '2', t: 'We review your application' },
                  { n: '3', t: 'Get your unique affiliate link' },
                ].map(({ n, t }) => (
                  <div key={n} style={applyStepStyle}>
                    <span style={applyStepNumStyle}>{n}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={applyRightStyle}>
              <div style={formCardStyle}>
                <AffiliateForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <div style={footerNoteStyle}>
        <p>
          Questions? Email{' '}
          <a href="mailto:affiliates@8os.ai" style={{ color: 'var(--color-accent)' }}>
            affiliates@8os.ai
          </a>
        </p>
      </div>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  background: 'var(--color-bg-primary)',
  color: 'var(--color-text-primary)',
  minHeight: '100vh',
}

const containerStyle: React.CSSProperties = {
  maxWidth: '1100px',
  margin: '0 auto',
  padding: '0 2rem',
}

const sectionStyle: React.CSSProperties = {
  padding: '5rem 0',
}

const eyebrowStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--color-accent)',
  marginBottom: '1rem',
}

const heroStyle: React.CSSProperties = {
  padding: '6rem 0 5rem',
  textAlign: 'center',
  background: 'linear-gradient(180deg, rgba(102,126,234,0.06) 0%, transparent 100%)',
}

const heroContentStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}

const heroTitleStyle: React.CSSProperties = {
  fontSize: 'clamp(2rem, 5vw, 3.25rem)',
  fontWeight: 800,
  lineHeight: 1.15,
  letterSpacing: '-0.03em',
  marginBottom: '1.25rem',
  color: '#fff',
}

const heroSubtitleStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.7,
  marginBottom: '2rem',
}

const heroCtaStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
  justifyContent: 'center',
}

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.875rem 2rem',
  background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
  borderRadius: '10px',
  color: '#fff',
  fontWeight: 600,
  fontSize: '1rem',
  textDecoration: 'none',
  transition: 'opacity 0.15s',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  marginBottom: '2.5rem',
  color: '#fff',
}

// How It Works
const stepsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1.5rem',
  marginBottom: '2rem',
}

const stepCardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  padding: '1.5rem',
}

const stepNumStyle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 800,
  color: 'var(--color-accent)',
  opacity: 0.4,
  marginBottom: '0.75rem',
}

const stepTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  color: '#fff',
  marginBottom: '0.5rem',
}

const stepDescStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.6,
}

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.5rem',
  flexWrap: 'wrap',
}

const metaBadgeStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-text-secondary)',
}

// Commission Table
const commissionTableStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  overflow: 'hidden',
  marginBottom: '1.5rem',
}

const tableHeaderStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr 1.5fr 1fr',
  padding: '0.875rem 1.5rem',
  background: 'rgba(255,255,255,0.04)',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-muted)',
  borderBottom: '1px solid var(--color-border)',
}

const tableRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr 1.5fr 1fr',
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid var(--color-border)',
  alignItems: 'center',
}

const tableCellStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  fontSize: '0.9375rem',
  color: 'var(--color-text-secondary)',
}

const recommendedBadgeStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  background: 'var(--color-accent)',
  color: '#fff',
  padding: '0.2rem 0.5rem',
  borderRadius: '999px',
  marginLeft: '0.5rem',
}

const exampleStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  color: 'var(--color-text-secondary)',
}

// Who Should Join
const whoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1rem',
}

const whoItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  fontSize: '0.9375rem',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.5,
}

// Perks
const perksGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1.25rem',
}

const perkCardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  padding: '1.5rem',
  textAlign: 'center',
}

const perkIconStyle: React.CSSProperties = {
  fontSize: '2rem',
  marginBottom: '0.75rem',
  display: 'block',
}

const perkTitleStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  fontWeight: 600,
  color: '#fff',
  marginBottom: '0.375rem',
}

const perkDescStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.5,
}

// Testimonial
const testimonialStyle: React.CSSProperties = {
  maxWidth: '680px',
  margin: '0 auto',
  padding: '2.5rem',
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '16px',
  textAlign: 'center',
}

const testimonialQuoteStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontStyle: 'italic',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.7,
  marginBottom: '1.25rem',
}

const testimonialAuthorStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-text-muted)',
}

// FAQ
const faqGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.5rem',
}

const faqItemStyle: React.CSSProperties = {
  padding: '1.25rem',
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
}

const faqQuestionStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  fontWeight: 600,
  color: '#fff',
  marginBottom: '0.625rem',
}

const faqAnswerStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.6,
}

// Apply Section
const applyLayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '4rem',
  alignItems: 'start',
}

const applyLeftStyle: React.CSSProperties = {}

const applySubtitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.6,
  marginBottom: '2rem',
}

const applyStepsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.875rem',
}

const applyStepStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.875rem',
  fontSize: '0.9375rem',
  color: 'var(--color-text-secondary)',
}

const applyStepNumStyle: React.CSSProperties = {
  width: '1.75rem',
  height: '1.75rem',
  borderRadius: '50%',
  background: 'var(--color-accent)',
  color: '#fff',
  fontWeight: 700,
  fontSize: '0.8125rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const applyRightStyle: React.CSSProperties = {}

const formCardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '16px',
  padding: '2rem',
}

const footerNoteStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '2rem 0 3rem',
  fontSize: '0.875rem',
  color: 'var(--color-text-muted)',
}
