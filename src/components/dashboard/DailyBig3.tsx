/**
 * Daily Big 3 — the morning focus block on /dashboard/today (OS-2164).
 *
 * Picks THREE suggested priority tasks for today, biased toward tasks/goals whose
 * domain maps to the user's currently-favorable elements (engine-derived in
 * GET /api/today/big3 — no metaphysics duplicated here). Shows a one-line
 * "why these" rationale tied to the favorable domains, plus the day's SOFT tint
 * line as gentle orientation (NOT a hard rule, no energy-hours).
 *
 * Accept = schedule the three into today via the existing /api/schedule.
 * Swap = replace one suggestion with the next alternate (client-side, no new API).
 * Archetype-skinned via the --skin-* CSS variables used across the dashboard.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'

interface Big3Task {
  id: string
  name: string
  domainId: string | null
  priority: string
  duration: number
  scheduledAt: string | null
  goalName: string | null
  favorVerdict: 'favorable' | 'unfavorable' | 'neutral' | null
  domainElement: string | null
  score: number
}

interface Big3Data {
  asOf: string
  favorableElements: string[]
  favorableDomains: string[]
  dayTint: { verdict: 'favorable' | 'unfavorable' | 'neutral'; line: string; pillar: string | null }
  rationale: string
  big3: Big3Task[]
  alternates: Big3Task[]
  counts: { candidates: number; favorableInBig3: number }
}

const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}
const VERDICT_COLOR: Record<string, string> = {
  favorable: '#22c55e', unfavorable: '#f59e0b', neutral: 'var(--color-text-secondary)',
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function DailyBig3({ onChanged }: { onChanged?: () => void }) {
  const [data, setData] = useState<Big3Data | null>(null)
  const [picks, setPicks] = useState<Big3Task[]>([])
  const [pool, setPool] = useState<Big3Task[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/today/big3', { cache: 'no-store' })
      if (!res.ok) {
        // 404 = no birth profile; hide the block quietly rather than error the page.
        setData(null); setLoading(false); return
      }
      const d = (await res.json()) as Big3Data
      setData(d); setPicks(d.big3 || []); setPool(d.alternates || [])
    } catch (e) {
      console.error('big3 load failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Swap one suggestion for the next alternate from the pool.
  function swap(taskId: string) {
    if (pool.length === 0) return
    const [next, ...rest] = pool
    setPicks((prev) => prev.map((p) => (p.id === taskId ? next : p)))
    // the swapped-out task rejoins the back of the pool so nothing is lost
    const swappedOut = picks.find((p) => p.id === taskId)
    setPool(swappedOut ? [...rest, swappedOut] : rest)
    setAccepted(false)
  }

  // Accept: make these three today's focus by scheduling each into today.
  async function accept() {
    if (busy || picks.length === 0) return
    setBusy(true); setErr(null)
    let placed = 0
    for (const p of picks) {
      try {
        if (p.scheduledAt) { placed++; continue } // already on today
        const res = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: p.id, searchFrom: new Date().toISOString(), searchDays: 1 }),
        })
        if (res.ok) placed++
      } catch (e) { console.error('big3 accept failed', p.id, e) }
    }
    setBusy(false)
    if (placed > 0) { setAccepted(true); onChanged?.() }
    else setErr('No free slots left today for these. They stay flagged as your focus.')
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-label="Loading today’s focus">
        <div style={{ height: 16, width: 140, borderRadius: 6, background: 'var(--color-border)', marginBottom: 12 }} />
        <div style={{ height: 12, width: '80%', borderRadius: 6, background: 'var(--color-border)', marginBottom: 16, opacity: 0.7 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 48, borderRadius: 10, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', marginBottom: 8 }} />
        ))}
      </div>
    )
  }

  if (!data || picks.length === 0) {
    return (
      <div
        role="status"
        aria-label="No focus items"
        style={{ textAlign: 'center', padding: '20px 8px 8px' }}
      >
        <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text-primary)', marginBottom: 6 }}>
          No focus items
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Select a goal or task to focus on today.
        </p>
        <a
          href="/dashboard/inbox"
          style={{
            display: 'inline-block',
            background: 'var(--color-accent)',
            color: '#fff',
            textDecoration: 'none',
            padding: '9px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Add task
        </a>
      </div>
    )
  }

  return (
    <section
      style={{
        background: 'var(--skin-card-bg, #FFFFFF)',
        border: '1px solid var(--skin-card-border, var(--color-border))',
        borderRadius: 'var(--skin-radius-card, 12px)',
        padding: 20, marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 'var(--skin-typo-heading-weight, 700)', color: 'var(--skin-color-text, #221F1A)' }}>
          Your Daily Big 3
        </h2>
        <span style={{ fontSize: 11, color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>
          favorable: {data.favorableDomains.length ? data.favorableDomains.map(cap).join(', ') : '-'}
          {data.favorableElements.length ? ` · ${data.favorableElements.join(', ')}` : ''}
        </span>
      </div>

      {/* why-these rationale, tied to the favorable domains */}
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--skin-color-text-secondary, #221F1A)', lineHeight: 1.5 }}>
        {data.rationale}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {picks.map((p, i) => {
          const color = p.favorVerdict ? VERDICT_COLOR[p.favorVerdict] : 'var(--color-text-muted)'
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              borderRadius: 10, background: 'var(--skin-color-surface, var(--color-bg-primary))',
              border: '1px solid var(--skin-card-border, var(--color-border))', borderLeft: `3px solid ${color}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--skin-color-text-muted, var(--color-text-muted))', width: 16, flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--skin-color-text, #221F1A)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--skin-color-text-muted, var(--color-text-muted))', marginTop: 2 }}>
                  {p.domainId ? `${DOMAIN_ICONS[p.domainId] ?? ''} ${cap(p.domainId)}` : 'no domain'}
                  {p.favorVerdict === 'favorable' ? ` · favorable${p.domainElement ? ` (${p.domainElement})` : ''}` : ''}
                  {p.scheduledAt ? ' · on today' : ` · ${p.duration}m`}
                </div>
              </div>
              {pool.length > 0 && (
                <button
                  onClick={() => swap(p.id)}
                  disabled={busy}
                  aria-label="Swap this suggestion"
                  style={{
                    background: 'transparent', border: '1px solid var(--skin-card-border, var(--color-border))', borderRadius: 6,
                    color: 'var(--skin-color-text-muted, var(--color-text-muted))', padding: '4px 9px', fontSize: 11, fontWeight: 600,
                    cursor: busy ? 'default' : 'pointer', flexShrink: 0,
                  }}
                >
                  ↻ Swap
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* soft day tint, gentle orientation, NOT a rule */}
      {data.dayTint.line && (
        <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--skin-color-text-muted, var(--color-text-muted))', fontStyle: 'italic', lineHeight: 1.45, display: 'flex', gap: 6 }}>
          <span style={{ color: VERDICT_COLOR[data.dayTint.verdict], fontStyle: 'normal' }}>◐</span>
          <span>{data.dayTint.line} <span style={{ opacity: 0.7 }}>(a gentle tint, not a rule)</span></span>
        </div>
      )}

      {err && <div style={{ marginTop: 10, fontSize: 12, color: '#B5502F' }}>{err}</div>}

      <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={accept}
          disabled={busy || accepted}
          style={{
            background: accepted ? 'transparent' : 'var(--skin-color-primary, var(--color-accent))',
            border: accepted ? '1px solid #4F7A52' : 'none', borderRadius: 8,
            color: accepted ? '#4F7A52' : '#fff', padding: '9px 16px', fontSize: 13, fontWeight: 600,
            cursor: busy || accepted ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          {accepted ? '✓ Set as today’s focus' : busy ? 'Scheduling…' : '✦ Accept & schedule into today'}
        </button>
        {!accepted && (
          <span style={{ fontSize: 11, color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>
            Swap any one before you commit.
          </span>
        )}
      </div>
    </section>
  )
}
