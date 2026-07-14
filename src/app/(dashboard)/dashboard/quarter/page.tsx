/**
 * /dashboard/quarter — Quarterly / 12-week planning horizon (流月 forward projection)
 *
 * Spec: docs/BAZI-PHASES-AND-PLANNER-RESEARCH.md + OS-2173. Paces goals to favorable
 * months: shows the upcoming ~3 BaZi solar months, each with its monthly pillar (流月),
 * a favorable / consolidate / steady verdict (vs the user's favorable elements), and the
 * user's goals suggested for pushing milestones that month.
 *
 * Reuses ONLY the verified GET /api/quarter endpoint (itself built on the same
 * src/lib/bazi-phases engine as /api/phases). Archetype-skinned via --skin-* CSS vars.
 * No energy UI. No calendar/scheduling/onboarding internals touched. Goal→month mapping
 * is read-only guidance (no schema change, no scheduler call).
 */
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { QuickAdd } from '@/components/dashboard/QuickAdd'

const MODE_COLOR: Record<string, string> = {
  push: '#22c55e', consolidate: '#f59e0b', steady: 'var(--color-text-secondary)',
}
const MODE_LABEL: Record<string, string> = {
  push: 'Push', consolidate: 'Consolidate', steady: 'Steady',
}
const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}
const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}

interface QMonth {
  index: number
  pillar: string
  element: string
  branchElement: string
  termName: string
  termEn: string
  startDate: string
  endDate: string
  label: string
  verdict: string
  mode: 'push' | 'consolidate' | 'steady'
  theme: string
  favorableDomains: string[]
}
interface QGoal {
  goalId: string
  name: string
  domain: string
  tenGod: string
  domainElement: string
  favorableMonthIndexes: number[]
  suggestedMonthIndex: number | null
}
interface QuarterData {
  asOf: string
  dayMaster: string
  dayElement: string
  strength: string
  favorable: string[]
  unfavorable: string[]
  favorableBasis: string
  months: QMonth[]
  goals: QGoal[]
}
interface SidebarGoal { id: string; domainId: string; name: string; progress: number }

function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }
function fmt(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export default function QuarterPage() {
  const [data, setData] = useState<QuarterData | null>(null)
  const [goals, setGoals] = useState<SidebarGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [qRes, gRes] = await Promise.all([
        fetch('/api/quarter?months=3', { cache: 'no-store' }),
        fetch('/api/goals?status=active', { cache: 'no-store' }),
      ])
      if (qRes.status === 404) {
        setError('Complete onboarding (birth details) to see your quarter.')
      } else if (!qRes.ok) {
        setError('Could not load your quarter. Refresh to try again.')
      } else {
        setData(await qRes.json())
      }
      const g = await gRes.json().catch(() => [])
      setGoals(Array.isArray(g) ? g.map((x: SidebarGoal) => ({ id: x.id, domainId: x.domainId, name: x.name, progress: x.progress })) : [])
    } catch (e) {
      console.error('Failed to load quarter:', e)
      setError('Could not load your quarter. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--skin-color-bg, #0a0a0a)' }}>
        <Sidebar goals={[]} />
        <main style={{ flex: 1, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--skin-color-text-muted, #666)' }}>Mapping your next 3 months…</div>
        </main>
        <QuickAdd />
      </div>
    )
  }

  // goals grouped by suggested month index
  const goalsByMonth: Record<number, QGoal[]> = {}
  for (const g of data?.goals ?? []) {
    if (g.suggestedMonthIndex !== null && g.suggestedMonthIndex !== undefined) {
      (goalsByMonth[g.suggestedMonthIndex] ??= []).push(g)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--skin-color-bg, #0a0a0a)' }}>
      <Sidebar goals={goals} />

      <main style={{ flex: 1, padding: '24px 24px', overflowY: 'auto', maxWidth: '100%', overflowX: 'hidden' }}>
        <div style={{ marginBottom: 20 }}>
          <Link href="/dashboard" style={{ color: 'var(--skin-color-text-muted, #555)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--skin-color-text, var(--color-border))' }}>Quarter · 12-week horizon</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--skin-color-text-muted, #666)', fontSize: 13 }}>
            Pace your goals to favorable months, the next 3 solar months (流月) and what each is best for.
          </p>
        </div>

        {error && (
          <div style={{ background: '#2a1515', border: '1px solid #5a2020', borderRadius: 8, color: '#f8b4b4', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {data && (
          <>
            {/* favorable elements summary */}
            <div style={{ background: 'var(--skin-card-bg, #0d0d0d)', border: '1px solid var(--skin-card-border, #1a1a1a)', borderRadius: 'var(--skin-radius-card, 12px)', padding: '14px 18px', marginBottom: 20, fontSize: 12, color: 'var(--skin-color-text-secondary, #aaa)' }}>
              <strong style={{ color: 'var(--skin-color-text, var(--color-border))' }}>{data.dayMaster} {cap(data.dayElement)} · {data.strength}</strong>
              {' '}· favorable: <span style={{ color: '#22c55e' }}>{(data.favorable || []).map(cap).join(', ') || '-'}</span>
              {' · '}headwind: <span style={{ color: '#f59e0b' }}>{(data.unfavorable || []).map(cap).join(', ') || '-'}</span>
              <div style={{ marginTop: 6, color: 'var(--skin-color-text-muted, #777)', fontStyle: 'italic' }}>{data.favorableBasis}</div>
            </div>

            {/* 3-month timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, (data.months || []).length)}, minmax(0, 1fr))`, gap: 16, alignItems: 'start' }}>
              {(data.months || []).map((mo) => {
                const monthGoals = goalsByMonth[mo.index] ?? []
                const color = MODE_COLOR[mo.mode] ?? 'var(--color-text-secondary)'
                return (
                  <section key={mo.index} style={{ background: 'var(--skin-card-bg, #0d0d0d)', border: '1px solid var(--skin-card-border, #1a1a1a)', borderTop: `3px solid ${color}`, borderRadius: 'var(--skin-radius-card, 12px)', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--skin-color-text, var(--color-border))' }}>{mo.label}</h2>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color }}>{MODE_LABEL[mo.mode]}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--skin-color-text-muted, #777)', marginTop: 2 }}>
                        {mo.pillar} · 流月 {mo.termName} ({mo.termEn}) · {fmt(mo.startDate)}-{fmt(mo.endDate)}
                        {mo.index === 0 ? ' · current' : ''}
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--skin-color-text-secondary, #bbb)' }}>{mo.theme}</p>

                    <div style={{ borderTop: '1px solid var(--skin-card-border, #1a1a1a)', paddingTop: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--skin-color-text-muted, #666)', marginBottom: 8 }}>
                        Push these milestones
                      </div>
                      {monthGoals.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--skin-color-text-muted, #777)', fontStyle: 'italic' }}>
                          {mo.mode === 'consolidate' ? 'Consolidation month, prep and tighten systems; hold launches.' : 'No goals mapped here yet.'}
                        </div>
                      ) : (
                        monthGoals.map((g) => (
                          <div key={g.goalId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 14 }}>{DOMAIN_ICONS[g.domain] ?? '◎'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Link href={`/goals/${g.goalId}`} style={{ color: 'var(--skin-color-text, var(--color-border))', fontSize: 12.5, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</Link>
                              <div style={{ fontSize: 10, color: DOMAIN_COLORS[g.domain] ?? '#888' }}>
                                {cap(g.domain)} · {g.tenGod} ({cap(g.domainElement)})
                                {g.favorableMonthIndexes.includes(mo.index) ? ' · favorable' : ' · earliest open'}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                )
              })}
            </div>

            <div style={{ marginTop: 18, fontSize: 11, color: 'var(--skin-color-text-muted, #666)', fontStyle: 'italic' }}>
              Grounded in traditional BaZi: each month is its 流月 monthly pillar (五虎遁 stem + solar-term branch),
              read against your favorable elements. A planning horizon, not a guarantee, the shorter the window, the softer the claim.
            </div>
          </>
        )}
      </main>
      <QuickAdd />
    </div>
  )
}
