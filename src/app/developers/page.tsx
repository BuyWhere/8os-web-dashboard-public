import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Developer docs, 8os.ai',
  description: 'Developer resources for integrating with 8os.ai and learning about upcoming API access.',
}

const resources = [
  {
    title: 'API access',
    description:
      '8os API access is being prepared for early partners. Contact us with your use case and we will help you choose the right integration path.',
    href: '/contact',
    cta: 'Contact the team',
  },
  {
    title: 'Security & privacy',
    description:
      'Review how 8os handles encryption, authentication, infrastructure, and responsible vulnerability reporting.',
    href: '/security',
    cta: 'Read security notes',
  },
  {
    title: 'Product capabilities',
    description:
      'Explore the archetype system, daily briefing, team compatibility, and integration-ready product areas.',
    href: '/features',
    cta: 'View features',
  },
]

export default function DevelopersPage() {
  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: 'var(--color-border)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 24px' }}>
        <Link href="/contact" style={{ color: '#93c5fd', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Back to contact
        </Link>

        <header style={{ marginTop: '40px', marginBottom: '48px' }}>
          <p style={{ color: '#93c5fd', fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Developer resources
          </p>
          <h1 style={{ fontSize: '42px', fontWeight: 700, color: 'var(--color-bg-secondary)', marginBottom: '16px' }}>
            Build with 8os
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--color-text-muted)', lineHeight: 1.65, maxWidth: '680px' }}>
            API documentation is coming soon. In the meantime, this page keeps the contact-page developer link useful and points technical visitors to the right next steps.
          </p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '48px' }}>
          {resources.map((resource) => (
            <article
              key={resource.title}
              style={{
                background: '#0f0f0f',
                border: '1px solid #1e1e2e',
                borderRadius: '14px',
                padding: '24px',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '10px' }}>
                {resource.title}
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.7, marginBottom: '18px' }}>
                {resource.description}
              </p>
              <Link href={resource.href} style={{ color: '#93c5fd', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
                {resource.cta} →
              </Link>
            </article>
          ))}
        </section>

        <section
          style={{
            background: '#0f0f1a',
            border: '1px solid #1e1b4b',
            borderRadius: '16px',
            padding: '28px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '10px' }}>
            Need integration details now?
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.75, marginBottom: '18px' }}>
            Share your integration goal, expected usage, and timeline. We typically reply within one business day.
          </p>
          <Link
            href="/contact"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#080808',
              background: '#e8b86d',
              borderRadius: '999px',
              padding: '10px 16px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            Contact 8os
          </Link>
        </section>
      </div>
    </div>
  )
}
