import Link from 'next/link';
import type { Metadata } from 'next';
import { SidebarNav } from '@/components/SidebarNav';
import { ContactForm } from '@/components/ContactForm';
import { CopyEmailButton } from '@/components/CopyEmailButton';

export const metadata: Metadata = {
  title: 'Contact, 8os',
  description: 'Get in touch with the 8os team.',
};

const SECTIONS = [
  { id: 'contact-header', label: 'Contact' },
  { id: 'contact-options', label: 'Email Options' },
  { id: 'contact-form', label: 'Send a Message' },
];

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
];

export default function ContactPage() {
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

          <section id="contact-options" aria-labelledby="contact-options-title" style={{ marginBottom: '3rem' }}>
            <h2 id="contact-options-title" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Email Options
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Email us directly using the addresses below.
            </p>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {EMAIL_OPTIONS.map((item) => (
                <div key={item.email} style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}>
                  <div className="landing-gold" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent-border)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    {item.label}
                  </div>
                  {/* OS-5935: mailto anchor now uses the gold accent token with
                      an underline + hover state so the link is visually distinct
                      from the surrounding paragraph text. The CopyEmailButton
                      beside it gives a second affordance for users who don't have
                      a mail client configured. */}
                  <div className="contact-email-row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                    <a
                      href={`mailto:${item.email}`}
                      className="contact-email-link"
                      style={{
                        color: 'var(--color-accent)',
                        textDecoration: 'underline',
                        textDecorationThickness: '1.5px',
                        textUnderlineOffset: '3px',
                        fontSize: '1rem',
                        fontWeight: 500,
                        transition: 'color 120ms ease',
                      }}
                    >
                      {item.email}
                    </a>
                    <CopyEmailButton email={item.email} />
                  </div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="contact-form">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Send a message
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Prefer the form? Drop your details below and we&apos;ll reply within 1-2 business days.
            </p>
            <ContactForm />
          </section>
        </main>
      </div>
    </div>
  );
}