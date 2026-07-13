'use client'

/**
 * AccountMenu — the ONE account surface.
 *
 * Clicking the profile avatar (top-right) opens this single dropdown, the home
 * for everything account-related: Profile, Billing, Preferences, Notifications,
 * Sources, an inline theme toggle, and Sign out. It replaces the old split
 * between Clerk's <UserButton> menu and the /settings pages — all of those now
 * live under one entry point that links into the unified /settings hub.
 *
 * Clerk provides identity (useUser) and sign-out (useClerk). Theme comes from
 * our ThemeProvider. Everything is token/inline-styled to match the warm
 * editorial brand and to flip correctly in dark mode.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { useTheme } from '@/components/ThemeProvider'
import type { ThemeChoice } from '@/lib/theme'

const MENU_LINKS: { href: string; label: string; desc: string }[] = [
  { href: '/settings/profile', label: 'Profile', desc: 'Name, email & sign-in' },
  { href: '/settings/billing', label: 'Billing', desc: 'Plan & subscription' },
  { href: '/settings/preferences', label: 'Preferences', desc: 'Theme, week start, timezone' },
  { href: '/settings/notifications', label: 'Notifications', desc: 'Briefs & quiet hours' },
  { href: '/settings/sources', label: 'Calendar & Sources', desc: 'Connect Google Calendar & sources' },
]

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' },
]

export function AccountMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { choice, setTheme } = useTheme()

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const name = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || 'Account'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const avatarUrl = user?.imageUrl
  const initial = (name || 'A').trim().charAt(0).toUpperCase()

  async function handleSignOut() {
    setOpen(false)
    await signOut(() => router.push('/'))
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: '1px solid var(--color-border)',
          background: avatarUrl ? `center/cover no-repeat url(${avatarUrl})` : 'var(--color-accent)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 600,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {!avatarUrl && initial}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 288,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            boxShadow: '0 16px 40px rgba(0,0,0,0.16)',
            padding: 8,
            zIndex: 200,
          }}
        >
          {/* Identity header */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px 10px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                flexShrink: 0,
                background: avatarUrl ? `center/cover no-repeat url(${avatarUrl})` : 'var(--color-accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {!avatarUrl && initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
              {email && (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)', margin: '2px 0 6px' }} />

          {/* Account links */}
          {MENU_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                padding: '9px 10px',
                borderRadius: 9,
                textDecoration: 'none',
                color: 'var(--color-text-primary)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{l.desc}</div>
            </Link>
          ))}

          <div style={{ height: 1, background: 'var(--color-border)', margin: '6px 0' }} />

          {/* Inline theme toggle */}
          <div style={{ padding: '4px 10px 8px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Theme
            </div>
            <div
              style={{
                display: 'flex',
                gap: 4,
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 9,
                padding: 3,
              }}
            >
              {THEME_OPTIONS.map((opt) => {
                const active = choice === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    aria-pressed={active}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 7,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: 600,
                      background: active ? 'var(--color-accent)' : 'transparent',
                      color: active ? '#fff' : 'var(--color-text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)', margin: '2px 0 6px' }} />

          {/* Sign out */}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '9px 10px',
              borderRadius: 9,
              border: 'none',
              background: 'transparent',
              color: 'var(--color-accent-2)',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
