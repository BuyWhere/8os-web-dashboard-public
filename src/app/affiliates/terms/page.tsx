import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Affiliate Program Terms & Conditions | 8os.ai',
  description: 'Terms and conditions for the 8os.ai Affiliate Program.',
}

export default function AffiliatesTermsPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        padding: '4rem 2rem',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link
          href="/affiliates"
          style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.875rem' }}
        >
          ← Back to Affiliate Program
        </Link>

        <div style={{ marginTop: '2.5rem', marginBottom: '3rem' }}>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-accent)',
              marginBottom: '0.75rem',
            }}
          >
            Affiliate Program
          </p>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#fff',
              marginBottom: '0.75rem',
            }}
          >
            Terms &amp; Conditions
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            T&amp;Cs coming soon, check back once the affiliate program officially launches.
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '0.75rem',
            }}
          >
            T&amp;Cs Under Review
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto' }}>
            Our legal team is finalizing the affiliate program terms and conditions.
            This page will be updated with the full document before the program launches publicly.
          </p>
          <p style={{ marginTop: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Questions? Email{' '}
            <a href="mailto:affiliates@8os.ai" style={{ color: 'var(--color-accent)' }}>
              affiliates@8os.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
