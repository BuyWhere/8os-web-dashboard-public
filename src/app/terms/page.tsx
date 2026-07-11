import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — 8os',
  description: 'Terms governing your use of the 8os platform.',
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p style={{ color: '#666', marginBottom: '3rem' }}>Last updated: May 2026</p>

        <div style={{ lineHeight: 1.8, color: '#ccc' }}>
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using 8os (&quot;Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              2. Description of Service
            </h2>
            <p>
              8os is a personalised productivity platform that combines BaZi analysis and AI to generate
              a Life Operating System tailored to each user. The Service is provided &quot;as is&quot; and may
              change over time.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              3. User Accounts
            </h2>
            <p style={{ marginBottom: '1rem' }}>You are responsible for:</p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Providing accurate and complete registration information</li>
            </ul>
            <p>You must be at least 13 years old to use the Service.</p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              4. Acceptable Use
            </h2>
            <p style={{ marginBottom: '1rem' }}>You agree not to:</p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorised access to any part of the Service</li>
              <li>Reverse-engineer or copy any part of the Service</li>
              <li>Use the Service to transmit spam or malicious content</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              5. Intellectual Property
            </h2>
            <p>
              All content, features, and functionality of the Service are owned by 8os and protected by
              intellectual property laws. Your user-generated content (goals, tasks, notes) remains yours.
              By using the Service you grant 8os a licence to use that content solely to operate the platform.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              6. Disclaimers and Limitation of Liability
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              The Service is provided &quot;as is&quot; without warranties of any kind. To the maximum extent
              permitted by law, 8os is not liable for any indirect, incidental, or consequential damages
              arising from your use of the Service.
            </p>
            <p>
              BaZi-based recommendations are for informational and productivity purposes only and do not
              constitute professional advice.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              7. Termination
            </h2>
            <p>
              We may suspend or terminate your access to the Service at any time for violation of these
              Terms. You may delete your account at any time from your settings.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              8. Changes to Terms
            </h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              9. Contact
            </h2>
            <p>
              For questions about these Terms, email{' '}
              <a href="mailto:legal@8os.ai" style={{ color: '#667eea' }}>legal@8os.ai</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
