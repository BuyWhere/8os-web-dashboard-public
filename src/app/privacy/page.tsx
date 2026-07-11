import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — 8os',
  description: 'How 8os collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#ededed',
      padding: '4rem 2rem',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/" style={{ color: '#667eea', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Back to 8os
        </Link>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '2rem', marginBottom: '0.5rem' }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#666', marginBottom: '3rem' }}>Last updated: May 2026</p>

        <div style={{ lineHeight: 1.8, color: '#ccc' }}>
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              1. Information We Collect
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              When you use 8os, we collect information you provide directly to us, such as:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Account information (email address, phone number, password)</li>
              <li>Birth date and time (used to generate your BaZi chart)</li>
              <li>Quiz responses and personality preferences</li>
              <li>Goals, tasks, and projects you create within the platform</li>
              <li>Usage data and interaction logs</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              2. How We Use Your Information
            </h2>
            <p style={{ marginBottom: '1rem' }}>We use the information we collect to:</p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Generate and personalise your Life Operating System</li>
              <li>Provide, maintain, and improve our services</li>
              <li>Send you product updates and transactional communications</li>
              <li>Analyse usage patterns to improve the platform</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              3. Data Sharing
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              We do not sell your personal data. We may share information with:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Service providers who help us operate the platform (e.g. cloud infrastructure, email delivery)</li>
              <li>Law enforcement or regulators when required by law</li>
            </ul>
            <p>All third-party providers are contractually required to protect your data.</p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              4. Data Retention
            </h2>
            <p>
              We retain your data for as long as your account is active. You may request deletion of your
              account and associated data at any time by contacting us at{' '}
              <a href="mailto:privacy@8os.ai" style={{ color: '#667eea' }}>privacy@8os.ai</a>.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              5. Security
            </h2>
            <p>
              We use industry-standard security measures including encryption in transit (TLS) and at rest.
              No system is 100% secure; please use a strong, unique password and enable two-factor
              authentication where available.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              6. Your Rights
            </h2>
            <p style={{ marginBottom: '1rem' }}>Depending on your location, you may have the right to:</p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability</li>
            </ul>
            <p>
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@8os.ai" style={{ color: '#667eea' }}>privacy@8os.ai</a>.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              7. Contact
            </h2>
            <p>
              For privacy-related enquiries, email{' '}
              <a href="mailto:privacy@8os.ai" style={{ color: '#667eea' }}>privacy@8os.ai</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
