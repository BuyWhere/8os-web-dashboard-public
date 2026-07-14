import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security | 8os.ai',
  description:
    'How 8os.ai protects your data, encryption, infrastructure, authentication, privacy by design, and vulnerability reporting.',
  keywords: ['8os security', '8os data privacy', '8os.ai encryption'],
}

const sections = [
  {
    id: 'encryption',
    heading: 'Data Encryption',
    icon: '🔒',
    color: '#22c55e',
    items: [
      {
        title: 'Transit Encryption',
        description:
          'All data transmitted between your browser and 8os servers is encrypted using TLS 1.3, the current industry standard. Older TLS versions are not supported.',
      },
      {
        title: 'At-Rest Encryption',
        description:
          'All persistent data is encrypted at rest using AES-256. This includes your profile data, archetype results, goal entries, and session tokens.',
      },
      {
        title: 'Encrypted Backups',
        description:
          'Database backups are encrypted with the same AES-256 standard and stored in geographically distributed, access-controlled locations.',
      },
    ],
  },
  {
    id: 'infrastructure',
    heading: 'Infrastructure',
    icon: '🏗️',
    color: '#38bdf8',
    items: [
      {
        title: 'Hosting',
        description:
          'The 8os frontend is hosted on Vercel, a SOC 2 Type II compliant platform with global edge distribution. Backend services run on Railway with dedicated isolated environments.',
      },
      {
        title: 'SOC 2 Alignment',
        description:
          'Our infrastructure partners hold SOC 2 Type II certifications. 8os itself is on a path to formal SOC 2 certification as the platform scales.',
      },
      {
        title: 'Environment Isolation',
        description:
          'Production, staging, and development environments are fully isolated. No production data is used in development or testing.',
      },
      {
        title: 'Uptime Monitoring',
        description:
          'We use continuous uptime and latency monitoring across all critical services. Incidents trigger automated alerting to the on-call engineer.',
      },
    ],
  },
  {
    id: 'authentication',
    heading: 'Authentication',
    icon: '🔑',
    color: 'var(--color-accent)',
    items: [
      {
        title: 'Password Hashing',
        description:
          'User passwords are never stored in plaintext. All passwords are hashed using bcrypt with a cost factor calibrated to current hardware capabilities.',
      },
      {
        title: 'Session Management',
        description:
          'Sessions are signed, expire after a configurable period of inactivity, and are invalidated on logout. Concurrent sessions from new devices trigger confirmation emails.',
      },
      {
        title: 'OAuth',
        description:
          'Third-party authentication (Google, GitHub) uses OAuth 2.0 with minimal, explicitly scoped permissions. We request only what we need, never broad profile or contact access.',
      },
      {
        title: 'Rate Limiting',
        description:
          'Authentication endpoints are rate-limited to prevent brute-force attacks. Repeated failed attempts trigger temporary lockouts with notification to the account email.',
      },
    ],
  },
  {
    id: 'privacy',
    heading: 'Privacy by Design',
    icon: '🛡️',
    color: '#f97316',
    items: [
      {
        title: 'Minimum Data Collection',
        description:
          'We collect only what is necessary to deliver your archetype profile and daily briefing. We do not collect location data, contact lists, or behavioral data beyond what you explicitly provide.',
      },
      {
        title: 'No Data Selling',
        description:
          'We do not sell, rent, or trade your personal data to any third party. We do not use your data to train AI models without explicit opt-in consent.',
      },
      {
        title: 'Data Export',
        description:
          'You can export all your personal data at any time from your account settings. Exports are delivered in JSON format within 24 hours.',
      },
      {
        title: 'Right to Delete',
        description:
          'You can permanently delete your account and all associated data at any time. Deletion is irreversible and completes within 30 days of request.',
      },
    ],
  },
  {
    id: 'integrations',
    heading: 'Third-Party Integrations',
    icon: '🔗',
    color: '#d97706',
    items: [
      {
        title: 'OAuth-Scoped Access',
        description:
          'When you connect third-party tools (Notion, Google Calendar, etc.), we use OAuth with the minimum required scopes. We do not request write access unless the integration explicitly requires it.',
      },
      {
        title: 'Token Storage',
        description:
          'OAuth tokens for connected services are stored encrypted and are never logged or exposed in error reports.',
      },
      {
        title: 'Revocation',
        description:
          'You can revoke any connected integration at any time from your account settings. Revocation removes our access immediately.',
      },
    ],
  },
]

export default function SecurityPage() {
  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', color: 'var(--color-border)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '56px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            Security
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
            How 8os.ai protects your data, from encryption and infrastructure to authentication and
            privacy controls.
          </p>
        </div>

        {/* Security Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              {/* Section Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '24px' }}>{section.icon}</span>
                <h2 style={{ fontSize: '22px', fontWeight: 600, color: section.color }}>
                  {section.heading}
                </h2>
              </div>

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {section.items.map((item) => (
                  <div
                    key={item.title}
                    style={{
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-bg-card)',
                      borderLeft: `3px solid ${section.color}`,
                      borderRadius: '0 10px 10px 0',
                      padding: '18px 20px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                      {item.title}
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.7 }}>
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Vulnerability Reporting */}
        <div
          style={{
            marginTop: '56px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-bg-card)',
            borderRadius: '16px',
            padding: '32px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            Vulnerability Reporting
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.75, marginBottom: '16px' }}>
            If you discover a security vulnerability in 8os.ai, please report it responsibly via
            email. We commit to acknowledging all reports within 24 hours, providing status updates
            within 72 hours, and crediting researchers who identify and responsibly disclose valid
            vulnerabilities.
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            Please do not publicly disclose vulnerabilities before we have had the opportunity to
            address them.
          </p>
          <a
            href="mailto:security@8os.ai"
            style={{
              color: 'var(--color-accent)',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            security@8os.ai
          </a>
        </div>

        {/* Last Updated */}
        <p style={{ color: '#475569', fontSize: '13px', textAlign: 'center', marginTop: '32px' }}>
          Security documentation last updated May 2026
        </p>
      </div>
    </div>
  )
}
