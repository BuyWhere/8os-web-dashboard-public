import type { Metadata } from 'next';
import Link from 'next/link';

// OS-2613 — branded 404. Default Next.js page was jarring white-on-system-font
// against the warm cream site chrome. Custom not-found.tsx renders inside the
// root layout (Header + Footer stay), so the body just needs brand tokens and
// useful navigation. Real status code is still 404 (server response).
export const metadata: Metadata = {
  title: 'Page not found — 8os',
  description: "We couldn't find that page. Try the home page, the archetype explorer, or the quiz.",
  robots: {
    index: false,
    follow: false,
  },
};

const SUGGESTED_LINKS: Array<{ href: string; label: string; hint: string }> = [
  { href: '/', label: 'Home', hint: 'Personalized life OS' },
  { href: '/archetypes/explorer', label: 'Archetype Explorer', hint: 'Browse all 5 archetypes' },
  { href: '/quiz', label: 'Quiz', hint: 'Find your archetype in 90s' },
  { href: '/features', label: 'Features', hint: 'What 8os does' },
  { href: '/pricing', label: 'Pricing', hint: 'Always free' },
];

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>
        <div
          aria-hidden="true"
          style={{
            fontSize: '5rem',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: 'var(--color-text-primary)',
            marginBottom: '1rem',
          }}
        >
          404
        </div>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            margin: '0 0 0.75rem',
            color: 'var(--color-text-primary)',
          }}
        >
          We couldn&apos;t find that page
        </h1>
        <p
          style={{
            margin: '0 0 2.5rem',
            fontSize: '1rem',
            lineHeight: 1.6,
            color: 'var(--color-text-secondary)',
          }}
        >
          The link may be broken, or the page may have moved. Here are some places
          worth a look:
        </p>

        <nav
          aria-label="Suggested pages"
          style={{
            display: 'grid',
            gap: '0.75rem',
            textAlign: 'left',
          }}
        >
          {SUGGESTED_LINKS.map(({ href, label, hint }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.875rem 1.25rem',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
                transition: 'border-color 0.15s',
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {hint} →
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}