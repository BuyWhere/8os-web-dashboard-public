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
        <p style={{ color: '#888', marginBottom: '3rem' }}>Last updated: July 2026</p>

        <div style={{ lineHeight: 1.8, color: '#ccc' }}>
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              The short version
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              8os is a personal life operating system. To work, it needs some genuinely personal information — your birth details, what you write in your journal, and (only if you connect one) your calendar. This page explains, in plain language, exactly what we collect, what it is used for, and how to get rid of it. We do not sell your data, and we never use your personal content to train AI models.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              1. Account information
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              When you create an account we collect your email address (and phone number if you provide one). Authentication is handled by Clerk, our sign-in provider. We use this only to operate your account, secure it, and send you transactional messages about your 8os.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              2. Birth data
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Your birth date, time, and location are the seed of your 8os chart. They are:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Encrypted at rest</strong> — stored only in encrypted form in our database.</li>
              <li><strong>Used only to compute your chart</strong> — your archetype, elements, and phase guidance. They are not shared with anyone and are not used for anything else.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              3. Journal entries and chat
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              What you write in your journal and say to the 8os assistant is analyzed <strong>on your account only</strong> by our AI to power features like goal alignment, the daily brief, and the shutdown ritual. Specifically:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Your journal and chat content is <strong>never used to train AI models</strong> — ours or anyone else&apos;s.</li>
              <li>Analysis results (e.g. &quot;this entry relates to your fitness goal&quot;) stay scoped to your account.</li>
              <li>Entries and conversations are <strong>user-deletable</strong>: you can delete them individually in the app, and deleting your account removes all of them.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              4. External calendar (what happens when you connect one)
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Connecting an external calendar (for example Google Calendar) is entirely optional. If you choose to connect one, here is exactly what we will read and why:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>What we read:</strong> event titles, start/end times, and attendees. We do not read event descriptions, attachments, or files.</li>
              <li><strong>Why:</strong> so 8os can schedule around your real commitments and measure how your time actually aligns with your stated goals.</li>
              <li><strong>Retention:</strong> synced calendar data is retained for a maximum of <strong>180 days</strong>, after which it is deleted automatically.</li>
              <li><strong>Disconnect any time:</strong> you can disconnect a calendar in Settings at any moment. Disconnecting stops all reading immediately, and the data we synced is removed.</li>
            </ul>
            <p style={{ marginBottom: '1rem' }}>
              8os&apos;s use and transfer of information received from Google APIs adheres to the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" style={{ color: '#667eea' }} target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              5. Analytics
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              We use <strong>PostHog</strong> to understand how the product is used and to catch errors: page views, feature usage, error reports, and session replays (with all text inputs masked). This helps us fix bugs and improve 8os. Analytics data is about how you use the app — it does not include your journal content, chat messages, or birth data.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              6. Payments
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Payments are processed by <strong>Stripe</strong>. Your card details go directly to Stripe and never touch our servers — we store only your subscription status and a Stripe customer reference.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              7. Data sharing
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              We do not sell your personal data. We share information only with the service providers needed to run 8os (cloud hosting, Clerk for sign-in, Stripe for payments, PostHog for analytics), and with law enforcement or regulators when required by law. All providers are contractually required to protect your data.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              8. Retention and deletion
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              We keep your data for as long as your account is active. When you delete your account, <strong>everything is removed</strong>: your birth data, chart, journal entries, chat history, goals, tasks, synced calendar data, and settings. You can request deletion in the app or by emailing{' '}
              <a href="mailto:privacy@8os.ai" style={{ color: '#667eea' }}>privacy@8os.ai</a>.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#ededed', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              9. Contact
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Questions about this policy or your data:{' '}
              <a href="mailto:privacy@8os.ai" style={{ color: '#667eea' }}>privacy@8os.ai</a>. If we change this policy, we will update this page and the date at the top.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
