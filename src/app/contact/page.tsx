import Link from 'next/link'
import type { Metadata } from 'next'
import { SidebarNav } from '@/components/SidebarNav'
import ContactForm from '@/components/ContactForm'

// Opt out of static generation to avoid build-timeouts from SidebarNav's
// client-side hydration logic. The page has no server-side data requirements.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contact — 8os',
  description: 'Get in touch with the 8os team.',
}

const SECTIONS = [
  { id: 'contact-header', label: 'Contact' },
  { id: 'contact-form', label: 'Send a message' },
  { id: 'contact-options', label: 'Other ways to reach us' },
]

const EMAIL_OPTIONS = [
  {
    label: 'General enquiries',
    email: 'hello@8os.ai',
    desc: 'Questions about 8os, feedback, or partnership opportunities.',
  },
  {
    label: 'Privacy & data',
    email: 'privacy@8os.ai',
    desc: 'Data deletion requests, privacy concerns, or GDPR/CCPA matters.',
  },
  {
    label: 'Legal',
    email: 'legal@8os.ai',
    desc: 'Terms of service questions or legal correspondence.',
  },
  {
    label: 'Support',
    email: 'support@8os.ai',
    desc: 'Help with your account, billing, or technical issues.',
  },
]

export default function ContactPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Force dynamic rendering by using searchParams
  void searchParams
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      padding: '4rem 2rem',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '3rem', alignItems: 'flex-start' }}>

        <SidebarNav sections={SECTIONS} />

        <main style={{ flex: 1, minWidth: 0 }}>
          <Link href="/" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Back to 8os
          </Link>

          <section id="contact-header" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Contact
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 0 }}>
              We&apos;d love to hear from you.
            </p>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '4rem' }}>
            {/* Left: contact form */}
            <section id="contact-form">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                Send us a message
              </h2>
              <ContactForm />
            </section>

            {/* Right: quick links + response time */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '1.5rem',
              }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.875rem' }}>
                  Response time
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                  We typically reply within <strong style={{ color: 'var(--color-text-primary)' }}>1 business day</strong>.
                  For urgent technical issues, check our{' '}
                  <Link href="/faq" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                    FAQ
                  </Link>{' '}
                  first.
                </p>
              </div>

              <div style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '1.5rem',
              }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.875rem' }}>
                  Not sure where to start?
                </h3>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {[
                    ['/faq', 'FAQ'],
                    ['/features', 'Features'],
                    ['/developers', 'Developer docs'],
                    ['/changelog', 'What&apos;s new'],
                  ].map(([href, label]) => (
                    <li key={href}>
                      <Link
                        href={href}
                        style={{
                          color: 'var(--color-accent)',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Other contact options */}
          <section id="contact-options" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem' }}>
              Other ways to reach us
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {EMAIL_OPTIONS.map((item) => (
                <div
                  key={item.email}
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                    {item.label}
                  </div>
                  <a
                    href={`mailto:${item.email}`}
                    className="contact-email-link"
                    style={{
                      color: 'var(--color-text-primary)',
                      textDecoration: 'underline',
                      textDecorationColor: 'rgba(102,126,234,0.4)',
                      textUnderlineOffset: '3px',
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                      transition: 'color 0.15s',
                    }}
                  >
                    {item.email}
                  </a>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem', lineHeight: 1.5, marginBottom: 0 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
