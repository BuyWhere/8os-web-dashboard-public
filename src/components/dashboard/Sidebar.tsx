'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fraunces } from 'next/font/google'
import { useSidebarDrawer, closeSidebarDrawer } from '@/lib/ui/sidebarDrawer'

// Editorial serif for the wordmark — matches the landing.
const fraunces = Fraunces({ subsets: ['latin'], weight: ['600'], variable: '--font-serif-side', display: 'swap' })

// ── Warm editorial palette ────────────────────────────────────────────────
const INK = '#221F1A'
const GRAY = '#6B6257'
const MUTED = '#9A9082'
const CREAM = '#F7F3EC'
const SURFACE = '#FFFFFF'
const GOLD = '#B08637'
const OXBLOOD = '#7A3B2E'
const HAIRLINE = '#E7DFD2'
const ACTIVE_BG = '#F2E9D6'

// ── Nav grouped into a sensible information architecture ──────────────────
// Every existing destination is preserved, just grouped + labeled.
interface NavItem { href: string; label: string; icon: React.ReactNode }
interface NavGroup { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Today',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <IconHome /> },
      { href: '/dashboard/briefing', label: 'Daily brief', icon: <IconSun /> },
      { href: '/dashboard/inbox', label: 'Inbox', icon: <IconInbox /> },
    ],
  },
  {
    label: 'Plan',
    items: [
      { href: '/goals', label: 'Goals', icon: <IconTarget /> },
      { href: '/calendar', label: 'Calendar', icon: <IconCalendar /> },
      { href: '/dashboard/tasks', label: 'Tasks', icon: <IconCheck /> },
    ],
  },
  {
    label: 'Reflect',
    items: [
      { href: '/dashboard/journal', label: 'Journal', icon: <IconBook /> },
      { href: '/dashboard/retro', label: 'Retro', icon: <IconRepeat /> },
      { href: '/dashboard/memory', label: 'Memory', icon: <IconSpark /> },
    ],
  },
  {
    label: 'Grow',
    items: [
      { href: '/dashboard/vision', label: 'Vision', icon: <IconCompass /> },
      { href: '/dashboard/archetype', label: 'Archetype', icon: <IconDiamond /> },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/settings/profile', label: 'Settings', icon: <IconGear /> },
    ],
  },
]

const DOMAIN_COLORS: Record<string, string> = {
  career: '#3F6C8E', wealth: '#B08637', health: '#4F7A52',
  relationships: '#B5652F', learning: '#3E8494', legacy: '#7E5A94',
}

interface Goal { id: string; domainId: string; name: string; progress: number }
interface Props { goals?: Goal[]; initialCollapsed?: boolean }

// ── The 8os mark — identical to the landing header ────────────────────────
function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="10.5" r="6" stroke={GOLD} strokeWidth="2" />
      <circle cx="16" cy="21.5" r="6.5" stroke={INK} strokeWidth="2" />
      <path d="M16 6.5 L16 14.5 M12.5 10.5 L19.5 10.5" stroke={OXBLOOD} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function Sidebar({ goals = [], initialCollapsed = false }: Props) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const pathname = usePathname()
  // Mobile drawer state — controlled by the Header hamburger via a shared store.
  const drawerOpen = useSidebarDrawer()

  const isActive = (href: string) =>
    pathname === href ||
    (href !== '/dashboard' && href !== '/dashboard/archetype' && pathname?.startsWith(href + '/'))

  return (
    <>
      {/* Mobile-only backdrop scrim — tap to close the drawer. */}
      <div
        className="app-sidebar-scrim"
        data-open={drawerOpen ? 'true' : 'false'}
        onClick={() => closeSidebarDrawer()}
        aria-hidden="true"
      />
      <aside
      className={`${fraunces.variable} app-sidebar`}
      data-open={drawerOpen ? 'true' : 'false'}
      style={{
        width: collapsed ? 64 : 236,
        minHeight: 'calc(100vh - var(--header-height))',
        background: SURFACE,
        borderRight: `1px solid ${HAIRLINE}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        flexShrink: 0,
        fontFamily: 'var(--font-sans), system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Single wordmark + collapse toggle */}
      <div style={{ padding: collapsed ? '18px 14px' : '18px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${HAIRLINE}` }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }} aria-label="8os dashboard">
          <Mark size={24} />
          {!collapsed && (
            <span style={{ fontFamily: 'var(--font-serif-side), Georgia, serif', fontWeight: 600, fontSize: 19, letterSpacing: '-0.01em', color: INK }}>
              8os
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 15, padding: 4, lineHeight: 1 }}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            ‹
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 15, padding: 4, lineHeight: 1, position: 'absolute', left: 46, marginTop: 2 }}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            ›
          </button>
        )}
      </div>

      {/* Grouped nav */}
      <nav style={{ padding: '10px 0', flex: 1, overflowY: 'auto' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 12 }}>
            {!collapsed && (
              <div style={{ padding: '6px 20px 4px', color: MUTED, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {group.label}
              </div>
            )}
            {group.items.map(({ href, label, icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => closeSidebarDrawer()}
                  title={collapsed ? label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    margin: collapsed ? '2px 8px' : '1px 10px',
                    padding: collapsed ? '9px 0' : '9px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    color: active ? INK : GRAY,
                    textDecoration: 'none',
                    background: active ? ACTIVE_BG : 'transparent',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    transition: 'background 0.12s, color 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'flex', color: active ? GOLD : MUTED, flexShrink: 0 }}>{icon}</span>
                  {!collapsed && <span>{label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Goals momentum — compact, warm */}
      {!collapsed && goals.length > 0 && (
        <div style={{ padding: '14px 18px', borderTop: `1px solid ${HAIRLINE}`, background: CREAM }}>
          <div style={{ color: MUTED, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Your goals
          </div>
          {goals.slice(0, 5).map((g) => (
            <Link key={g.id} href={`/goals/${g.id}`} onClick={() => closeSidebarDrawer()} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, textDecoration: 'none' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: DOMAIN_COLORS[g.domainId] ?? GOLD }} />
              <span style={{ color: GRAY, fontSize: 12.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
              <span style={{ color: MUTED, fontSize: 11, fontWeight: 600 }}>{Math.round(g.progress * 100)}%</span>
            </Link>
          ))}
        </div>
      )}
      </aside>

      {/* ── Responsive behavior ────────────────────────────────────────────
          Desktop (≥768px): the <aside> stays in-flow exactly as before.
          Mobile (<768px): the sidebar is pulled out of flow into a fixed
          overlay drawer that slides in from the left over a scrim. The scrim
          + drawer are toggled by the Header hamburger (shared store). CSS
          !important overrides the inline width/position so the drawer works
          without touching the desktop layout. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* Scrim hidden by default (also on desktop). */
          .app-sidebar-scrim { display: none; }
          @media (max-width: 767px) {
            .app-sidebar {
              position: fixed !important;
              top: var(--header-height) !important;
              left: 0 !important;
              bottom: 0 !important;
              width: 236px !important;
              min-height: 0 !important;
              height: calc(100vh - var(--header-height)) !important;
              z-index: 150 !important;
              transform: translateX(-100%);
              transition: transform 0.24s ease !important;
              box-shadow: none;
            }
            .app-sidebar[data-open="true"] {
              transform: translateX(0);
              box-shadow: 0 0 40px rgba(34, 31, 26, 0.18);
            }
            .app-sidebar-scrim {
              display: block;
              position: fixed;
              top: var(--header-height);
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(34, 31, 26, 0.42);
              z-index: 140;
              opacity: 0;
              pointer-events: none;
              transition: opacity 0.24s ease;
            }
            .app-sidebar-scrim[data-open="true"] {
              opacity: 1;
              pointer-events: auto;
            }
          }
        `,
        }}
      />
    </>
  )
}

// ── Line icons (warm, editorial, 18px) ────────────────────────────────────
function I({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
function IconHome() { return <I><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></I> }
function IconSun() { return <I><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></I> }
function IconInbox() { return <I><path d="M3 12h5l2 3h4l2-3h5" /><path d="M4 6h16v12H4z" /></I> }
function IconTarget() { return <I><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></I> }
function IconCalendar() { return <I><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></I> }
function IconCheck() { return <I><path d="M4 12l5 5L20 6" /></I> }
function IconBook() { return <I><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" /><path d="M4 17h14" /></I> }
function IconRepeat() { return <I><path d="M4 8a6 6 0 0 1 10-3l2 2" /><path d="M20 16a6 6 0 0 1-10 3l-2-2" /><path d="M16 3v4h-4M8 21v-4h4" /></I> }
function IconSpark() { return <I><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></I> }
function IconCompass() { return <I><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></I> }
function IconDiamond() { return <I><path d="M12 2l8 8-8 12L4 10z" /></I> }
function IconGear() { return <I><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></I> }
