'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { href: '/dashboard/briefing', icon: '☀', label: 'Daily Briefing' },
  { href: '/dashboard/journal', icon: '◧', label: 'Journal' },
  { href: '/dashboard/archetype', icon: '◈', label: 'Archetype' },
  { href: '/dashboard/archetype/compare', icon: '⊞', label: 'Compare Archetypes' },
  { href: '/calendar', icon: '◫', label: 'Calendar' },
  { href: '/goals', icon: '◎', label: 'Goals' },
  { href: '/settings/profile', icon: '◉', label: 'Settings' },
]

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}

interface Goal {
  id: string
  domainId: string
  name: string
  progress: number
}

interface Props {
  goals?: Goal[]
  initialCollapsed?: boolean
}

export function Sidebar({ goals = [], initialCollapsed = false }: Props) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const pathname = usePathname()

  return (
    <aside style={{
      width: collapsed ? 56 : 220,
      minHeight: '100vh',
      background: '#0d0d0d',
      borderRight: '1px solid #1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Logo + Collapse */}
      <div style={{ padding: collapsed ? '16px 12px' : '16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1a1a1a' }}>
        {!collapsed && <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>8os</span>}
        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, padding: 4, lineHeight: 1, marginLeft: collapsed ? 'auto' : 0 }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 0', flex: 1 }}>
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href || (
            href !== '/dashboard' &&
            href !== '/dashboard/archetype' &&
            pathname?.startsWith(href + '/')
          ) || (
            href === '/dashboard/archetype' && pathname === '/dashboard/archetype'
          )
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '10px 16px' : '10px 20px',
                color: active ? '#ededed' : '#666',
                textDecoration: 'none',
                background: active ? '#1a1a1a' : 'transparent',
                borderLeft: active ? '2px solid #6366f1' : '2px solid transparent',
                fontSize: 14,
                transition: 'all 0.1s',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Goals list */}
      {!collapsed && goals.length > 0 && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1a1a1a' }}>
          <div style={{ color: '#888', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Goals
          </div>
          {goals.slice(0, 5).map((g) => (
            <Link
              key={g.id}
              href={`/goals/${g.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, textDecoration: 'none' }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: DOMAIN_COLORS[g.domainId] ?? '#666',
              }} />
              <span style={{ color: '#888', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {g.name}
              </span>
              <span style={{ color: '#888', fontSize: 11 }}>{Math.round(g.progress * 100)}%</span>
            </Link>
          ))}
        </div>
      )}
    </aside>
  )
}
