'use client'

import { useState } from 'react'
import Link from 'next/link'

const INK = '#221F1A'
const GRAY = '#6B6257'
const GOLD = '#8A6728' // OS-2712: darkened for WCAG AA (white-on-gold 5.18:1; gold text 4.69:1 on cream)
const OXBLOOD = '#7A3B2E'
const HAIRLINE = '#E7DFD2'

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
]

function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="10.5" r="6" stroke={GOLD} strokeWidth="2" />
      <circle cx="16" cy="21.5" r="6.5" stroke={INK} strokeWidth="2" />
      <path d="M16 6.5 L16 14.5 M12.5 10.5 L19.5 10.5" stroke={OXBLOOD} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export default function LandingHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 200,
        background: 'rgba(247, 243, 236, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '0 1.5rem',
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            textDecoration: 'none',
          }}
          aria-label="8os home"
        >
          <Mark />
          <span
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: '1.375rem',
              fontWeight: 600,
              color: INK,
              letterSpacing: '-0.01em',
            }}
          >
            8os
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="lh-desktop-nav"
          aria-label="Primary"
          style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}
        >
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              style={{
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: GRAY,
                textDecoration: 'none',
              }}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Desktop auth */}
        <div className="lh-desktop-auth" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <a
            href="/login"
            style={{ fontSize: '0.9375rem', fontWeight: 600, color: INK, textDecoration: 'none' }}
          >
            Log in
          </a>
          <a
            href="/signup"
            style={{
              padding: '0.55rem 1.15rem',
              background: GOLD,
              color: '#FFFFFF',
              fontSize: '0.9375rem',
              fontWeight: 600,
              borderRadius: '9px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(176, 134, 55, 0.25)',
            }}
          >
            Sign up
          </a>
        </div>

        {/* Hamburger */}
        <button
          className="lh-hamburger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'none',
            background: 'transparent',
            border: `1px solid ${HAIRLINE}`,
            borderRadius: '9px',
            width: '42px',
            height: '42px',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </>
            ) : (
              <>
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="lh-mobile-menu"
          style={{
            borderTop: `1px solid ${HAIRLINE}`,
            background: '#F7F3EC',
            padding: '1rem 1.5rem 1.5rem',
          }}
        >
          <nav aria-label="Mobile" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                style={{
                  padding: '0.75rem 0',
                  fontSize: '1.0625rem',
                  fontWeight: 500,
                  color: INK,
                  textDecoration: 'none',
                  borderBottom: `1px solid ${HAIRLINE}`,
                }}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
            <a
              href="/login"
              onClick={() => setOpen(false)}
              style={{
                textAlign: 'center',
                padding: '0.8rem',
                border: `1px solid ${HAIRLINE}`,
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 600,
                color: INK,
                textDecoration: 'none',
              }}
            >
              Log in
            </a>
            <a
              href="/signup"
              onClick={() => setOpen(false)}
              style={{
                textAlign: 'center',
                padding: '0.8rem',
                background: GOLD,
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Sign up
            </a>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media (max-width: 840px) {
            .lh-desktop-nav { display: none !important; }
            .lh-desktop-auth { display: none !important; }
            .lh-hamburger { display: flex !important; }
          }
        `,
        }}
      />
    </header>
  )
}
