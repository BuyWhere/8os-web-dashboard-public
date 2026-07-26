'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inter } from 'next/font/google';
import { SignedIn, SignedOut, ClerkLoading, ClerkLoaded } from '@clerk/nextjs';
import { openSidebarDrawer } from '@/lib/ui/sidebarDrawer';
import { AccountMenu } from '@/components/AccountMenu';

// Editorial serif for the wordmark — matches the landing header.
const fraunces = Inter({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-serif-header',
  display: 'swap',
});

// ── Dark header palette (guarantees WCAG AA contrast on every page) ───────
// Hard-coded light values so the header is readable regardless of the global
// light/dark theme or any future token changes.
const INK = '#FFFFFF';
const GRAY = 'rgba(255, 255, 255, 0.9)';
const CREAM = 'var(--color-bg-primary)';
const GOLD = 'var(--color-accent)';
const OXBLOOD = '#C06B54';
const HAIRLINE = 'rgba(255, 255, 255, 0.1)';

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
];

// Authenticated app routes — inside these the header shows the logged-in
// (account) state, never the marketing nav or Log in / Sign up.
const APP_PREFIXES = ['/dashboard', '/goals', '/calendar', '/settings', '/onboarding'];

function isAppRoute(pathname: string): boolean {
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// ── The shared 8os wordmark (same mark as LandingHeader) ──────────────────
function Mark({ size = 24, on = 'light' }: { size?: number; on?: 'light' | 'cream' }) {
  const ink = on === 'light' ? INK : INK;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="10.5" r="6" stroke={GOLD} strokeWidth="2" />
      <circle cx="16" cy="21.5" r="6.5" stroke={ink} strokeWidth="2" />
      <path d="M16 6.5 L16 14.5 M12.5 10.5 L19.5 10.5" stroke={OXBLOOD} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();

  // The landing page ("/") ships its own warm editorial header (LandingHeader).
  if (pathname === '/') return null;

  const appRoute = isAppRoute(pathname);

  // ── Authenticated app header: warm, account menu, no marketing nav ──────
  if (appRoute) {
    return (
      <header
        className={`${fraunces.variable} app-topbar`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'var(--header-height)',
          // Theme token, not a hardcoded near-black: the dark bar over the warm
          // cream app looked broken in light mode and fought the design system.
          background: 'var(--color-bg-card)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Mobile-only hamburger, opens the sidebar drawer. On desktop the
              sidebar is always visible, so this is hidden (media query below).
              The 8os wordmark lives ONLY in the sidebar on app routes, so it is
              intentionally not rendered here (no duplicate wordmark). */}
          <button
            className="app-header-hamburger"
            aria-label="Open navigation menu"
            onClick={() => openSidebarDrawer()}
            style={{
              display: 'none',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '9px',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </svg>
          </button>

          {/* Account menu, the single account surface. The profile avatar
              opens AccountMenu (Profile / Billing / Preferences / Notifications
              / Sources / theme / Sign out), replacing Clerk's <UserButton>.
              marginLeft:auto pins this group to the RIGHT edge of the header on
              desktop. Without it, the hamburger is display:none on desktop, so
              this becomes the sole space-between child and gets pinned LEFT,
              which made AccountMenu's right:0 dropdown open off-screen-left. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginLeft: 'auto' }}>
            <SignedIn>
              <AccountMenu />
            </SignedIn>
            {/* If a session somehow isn't present on an app route, offer a
                quiet sign-in link, never the marketing Sign up CTA. */}
            <SignedOut>
              <Link
                href="/login"
                style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: 'none' }}
              >
                Sign in
              </Link>
            </SignedOut>
          </div>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `@media (max-width: 767px){ .app-header-hamburger{ display: flex !important; } }
                     @media (min-width: 768px){ .app-topbar{ display: none !important; } }`,
          }}
        />
      </header>
    );
  }

  // ── Marketing header (warm editorial, matches the landing) ──────────────
  return (
    <header
      className={fraunces.variable}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--header-height)',
        background: 'rgba(13, 13, 15, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${HAIRLINE}`,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        padding: '0 2rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', textDecoration: 'none' }}
          aria-label="8os home"
        >
          <Mark size={24} />
          <span
            style={{
              fontFamily: 'var(--font-serif-header), Georgia, serif',
              fontSize: '1.3rem',
              fontWeight: 600,
              color: INK,
              letterSpacing: '-0.01em',
            }}
          >
            8os
          </span>
        </Link>

        {/* Marketing nav, signed-out visitors only */}
        <nav className="header-nav-links" aria-label="Site navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: pathname.startsWith(href) ? INK : GRAY,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth actions. Single primary CTA removed per OS-2515 — "Get started" in
            hero is the sole primary CTA. On archetype pages the CTA below is the
            conversion path; this clusters both buttons on the right. Hide the
            Log in link on /login to avoid a redundant dead self-link (OS-3976). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* CTA — shown on archetype SEO pages so organic visitors have an immediate
              conversion path. Rendered INSIDE the auth-actions container so it clusters
              with Log in on the right edge. */}
          {pathname.startsWith('/archetypes/') && (
            <Link
              href="/onboarding"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--color-accent)',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Get Started →
            </Link>
          )}
          <ClerkLoading>
            {pathname !== '/login' && (
              <Link
                href="/login"
                style={{ fontSize: '0.9375rem', fontWeight: 600, color: INK, textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                Log in
              </Link>
            )}
          </ClerkLoading>
          <ClerkLoaded>
          <SignedOut>
            {pathname !== '/login' && (
              <Link
                href="/login"
                style={{ fontSize: '0.9375rem', fontWeight: 600, color: INK, textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                Log in
              </Link>
            )}
          </SignedOut>
          <SignedIn>
            {/* A signed-in user browsing a marketing page still gets their
                account menu + a way back into the app, never Log in/Sign up. */}
            <Link
              href="/dashboard"
              style={{ fontSize: '0.9375rem', fontWeight: 600, color: INK, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Dashboard
            </Link>
            <AccountMenu />
          </SignedIn>
          </ClerkLoaded>
        </div>
      </div>
    </header>
  );
}
