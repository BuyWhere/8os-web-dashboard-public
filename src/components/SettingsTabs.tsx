'use client'

/**
 * SettingsTabs — the shared account-area tab bar.
 *
 * Renders the coherent account IA (Profile / Billing / Preferences /
 * Notifications / Sources) so every settings page shares one navigation and
 * the profile dropdown, the tabs, and the pages all describe the same account
 * area. Token-styled so it flips in dark mode. Drop this at the top of a
 * settings page's <main>.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS: { href: string; label: string }[] = [
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/billing', label: 'Billing' },
  { href: '/settings/preferences', label: 'Preferences' },
  { href: '/settings/notifications', label: 'Notifications' },
  { href: '/settings/sources', label: 'Sources' },
]

export function SettingsTabs({ active }: { active?: string }) {
  const pathname = usePathname()
  const current = active ?? pathname ?? ''

  return (
    <div style={{ marginBottom: 24 }}>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: '0 0 16px',
          fontFamily: 'var(--font-serif), Georgia, serif',
        }}
      >
        Account
      </h1>
      <nav
        aria-label="Account settings"
        style={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 0,
        }}
      >
        {TABS.map((t) => {
          const isActive = current === t.href || current.startsWith(t.href + '/')
          return (
            <Link
              key={t.href}
              href={t.href}
              style={{
                padding: '9px 14px',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
