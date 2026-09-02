'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PRODUCT_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/reveal', label: 'Reveal' },
];

const COMPANY_LINKS = [
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

const SOCIAL_LINKS = [
  { href: 'https://twitter.com/8os', label: 'Twitter', icon: 'X' },
  { href: 'https://t.me/os8ai', label: 'Telegram', icon: 'TG' },
];

export function Footer() {
  const [year, setYear] = useState('2026');
  useEffect(() => setYear(String(new Date().getFullYear())), []);
  const pathname = usePathname();

  // Inside the authenticated app the marketing footer is out of place —
  // the app is a full-height shell (sidebar + main). Suppress it there.
  const APP_PREFIXES = ['/dashboard', '/goals', '/calendar', '/settings', '/onboarding'];
  if (APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null;

  return (
    <footer
      style={{
        background: 'var(--color-bg-primary)',
        borderTop: '1px solid var(--color-border)',
        padding: '3.5rem 1.5rem 2.5rem',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
        }}
      >
        <div
          className="site-footer-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr 1fr',
            gap: '2.5rem',
          }}
        >
          <div>
            <Link
              href="/"
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
                letterSpacing: '-0.03em',
              }}
            >
              8os
            </Link>
            <p
              style={{
                margin: '0.9rem 0 0',
                fontSize: '0.9375rem',
                lineHeight: 1.65,
                color: 'var(--color-text-secondary)',
                maxWidth: '22rem',
              }}
            >
              A life OS built on your real BaZi chart. Right goal, right season, the planner that knows when to push.
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '1.25rem' }}>
              <a
                href="mailto:hello@8os.ai"
                style={{
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                hello@8os.ai
              </a>
            </p>
          </div>

          <FooterCol heading="Product" links={PRODUCT_LINKS} />
          <FooterCol heading="Company" links={COMPANY_LINKS} />
        </div>

        <div
          style={{
            marginTop: '3rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            © {year} 8os. All rights reserved.
          </p>
          <nav aria-label="Social" style={{ display: 'flex', gap: '0.75rem' }}>
            {SOCIAL_LINKS.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {icon}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media (max-width: 900px) {
            .site-footer-grid { grid-template-columns: 1fr 1fr !important; }
          }
          @media (max-width: 560px) {
            .site-footer-grid { grid-template-columns: 1fr !important; }
          }
        `,
        }}
      />
    </footer>
  );
}

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-secondary)',
          marginBottom: '1rem',
        }}
      >
        {heading}
      </div>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              style={{
                fontSize: '0.9375rem',
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
              }}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
