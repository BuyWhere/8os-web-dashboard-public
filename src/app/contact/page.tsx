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
  { id: 'contact-form', label: 'Send a Message' },
  { id: 'contact-options', label: 'Email Options' },
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
    <div className="contact-page" style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      padding: '4rem 2rem 6rem',
    }}>
      <div className="contact-container" style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '3rem', alignItems: 'flex-start' }}>

        <SidebarNav sections={SECTIONS} />

        <main style={{ flex: 1, minWidth: 0 }}>
          <Link href="/" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Back to 8os
          </Link>

          <section id="contact-header" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Contact
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 0 }}>
              We&apos;d love to hear from you.
            </p>
          </section>

          <section id="contact-form">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Send a message
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Drop your details below and we&apos;ll reply within 1-2 business days.
            </p>
            <div style={{ paddingBottom: '5rem' }}>
              <ContactForm />
            </div>
          </section>

          <section id="contact-options" aria-labelledby="contact-options-title" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
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
        </main>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          /* OS-7626 r3: aggressive tightening so submit button clears 844px fold
             and FAB does not overlap the message textarea. Live probe at 390x844
             (2026-09-20) showed: textarea top=745px/bottom=887px, FAB
             toggle at 772-820px (overlapping textarea top 745-820px), submit
             button below fold. Strategy: hide page header copy, trim intro
             sections, reduce form row height, shrink FAB. */
          .contact-page { padding: 0.5rem 1rem 5rem !important; }
          .contact-container { gap: 0 !important; flex-direction: column !important; }
          main > a[href="/"] { display: none !important; }
          #contact-header { margin-top: 0.2rem !important; margin-bottom: 0.5rem !important; }
          #contact-header h1 { font-size: 1.25rem !important; margin-bottom: 0.1rem !important; line-height: 1.1 !important; }
          #contact-header p { display: none !important; }
          #contact-form { margin-bottom: 0 !important; }
          #contact-form > div { padding-bottom: 0 !important; }
          #contact-form form { padding: 0.875rem !important; gap: 0.6rem !important; }
          #contact-form h2 { font-size: 1rem !important; margin-bottom: 0.15rem !important; }
          #contact-form > p { display: none !important; }
          #contact-form form > div { margin-bottom: 0.35rem !important; }
          #contact-form label { font-size: 0.8rem !important; margin-bottom: 0.08rem !important; }
          #contact-form input { padding: 0.4rem 0.55rem !important; font-size: 15px !important; min-height: 38px !important; }
          #contact-form textarea { padding: 0.4rem 0.55rem !important; font-size: 15px !important; min-height: 56px !important; }
          #contact-form button[type="submit"] {
            min-height: 44px !important;
            font-size: 0.9rem !important;
            margin-top: 0.15rem !important;
            padding: 0.6rem 1rem !important;
          }
          /* OS-7626 r3: smaller FAB so it consumes less bottom-right real-estate.
             Live probe showed it at 772-820px overlapping the textarea top. */
          .sidebar-mobile-toggle {
            width: 40px !important;
            height: 40px !important;
            bottom: 0.75rem !important;
            right: 0.75rem !important;
            font-size: 1rem !important;
          }
          /* OS-7626 r3: hide email options section on mobile - form is priority;
             users can reach email options by scrolling on desktop. */
          #contact-options { display: none !important; }
        }
      ` }} />
    </div>  );
}
