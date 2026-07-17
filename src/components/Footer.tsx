'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const FOOTER_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/archetypes/explorer', label: 'Archetype Explorer' },
];

const SOCIAL_LINKS = [
  { href: 'https://twitter.com/8os', label: 'Twitter', icon: 'X' },
  { href: 'https://t.me/os8ai', label: 'Telegram', icon: 'TG' },
];

export function Footer() {
  const pathname = usePathname();

  // The landing page ("/") ships its own warm editorial footer
  // (see src/app/page.tsx). Suppress the global footer there.
  if (pathname === '/') return null;

  // Inside the authenticated app the marketing footer is out of place —
  // the app is a full-height shell (sidebar + main). Suppress it there.
  const APP_PREFIXES = ['/dashboard', '/goals', '/calendar', '/settings', '/onboarding'];
  if (APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null;

  return (
    <footer
      style={{
        background: 'var(--color-bg-primary)',
        borderTop: '1px solid var(--color-border)',
        padding: '3rem 2rem',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Main footer content */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '2rem',
          }}
        >
          {/* Brand column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                margin: 0,
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                maxWidth: '280px',
              }}
            >
              Your personalized life operating system. Free. No credit card. Works in your browser.
            </p>
          </div>

          {/* Navigation columns */}
          <nav
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '3rem',
            }}
            aria-label="Footer navigation"
          >
            {/* Main links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Navigation
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {FOOTER_LINKS.slice(0, 3).map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-text-secondary)',
                      textDecoration: 'none',
                      transition: 'color 0.15s',
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Legal
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {FOOTER_LINKS.slice(3).map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-text-secondary)',
                      textDecoration: 'none',
                      transition: 'color 0.15s',
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Social links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Connect
              </span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
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
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                  >
                    {icon}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom bar */}
        <div
          style={{
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
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
            }}
          >
            © {new Date().getFullYear()} 8os. All rights reserved.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Personalized OS for life
          </p>
        </div>
      </div>
    </footer>
  );
}
