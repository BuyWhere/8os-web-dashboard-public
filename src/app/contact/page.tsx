import Link from 'next/link';
import type { Metadata } from 'next';
import { SidebarNav } from '@/components/SidebarNav';

export const metadata: Metadata = {
  title: 'Contact — 8os',
  description: 'Get in touch with the 8os team.',
};

const SECTIONS = [
  { id: 'contact-header', label: 'Contact' },
  { id: 'contact-options', label: 'Contact Options' },
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

          <section id="contact-options">
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {[
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
              ].map((item) => (
                <div key={item.email} style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    {item.label}
                  </div>
                  <a href={`mailto:${item.email}`} style={{ color: 'var(--color-text-primary)', textDecoration: 'none', fontSize: '1rem', fontWeight: 500 }}>
                    {item.email}
                  </a>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
