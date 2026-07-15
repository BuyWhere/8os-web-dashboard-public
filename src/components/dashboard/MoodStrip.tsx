/**
 * MoodStrip — E-9 mood/energy history strip for /dashboard (backlog §5).
 *
 * A light, archetype-skinned card: the last ~14 local days of mood + energy
 * (1-5) as small bars, plus the weekly happiness-correlation insight WHEN it
 * clears threshold (n ≥ 10 logs AND |r| ≥ 0.3). Below threshold the insight is
 * suppressed and only the history (or an empty-state pointer to shutdown) shows.
 *
 * Best-effort client fetch of /api/mood + /api/mood/insights — any failure
 * leaves the strip quiet; it can never crash the dashboard.
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HistoryPoint { localDate: string; mood: number | null; energy: number | null }
interface Insight { domain: string; metric: 'mood' | 'energy'; r: number; weeks: number; text: string }

const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}

function Bars({ points }: { points: HistoryPoint[] }) {
  if (points.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 44, marginTop: 10 }}>
      {points.map((p) => {
        const m = p.mood ?? 0
        const e = p.energy ?? 0
        return (
          <div key={p.localDate} title={`${p.localDate} · mood ${p.mood ?? '-'} · energy ${p.energy ?? '-'}`}
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2, flex: 1, minWidth: 6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
              <div style={{ flex: 1, height: `${(m / 5) * 100}%`, minHeight: m ? 3 : 0, background: 'var(--skin-color-accent, var(--color-accent))', borderRadius: 2, opacity: 0.9 }} />
              <div style={{ flex: 1, height: `${(e / 5) * 100}%`, minHeight: e ? 3 : 0, background: 'var(--skin-color-primary, #4F7A52)', borderRadius: 2, opacity: 0.75 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function MoodStrip({ gapPx = 20 }: { gapPx?: number }) {
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [loggedToday, setLoggedToday] = useState<boolean | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [hRes, iRes] = await Promise.all([
          fetch('/api/mood', { cache: 'no-store', credentials: 'same-origin' }),
          fetch('/api/mood/insights', { cache: 'no-store', credentials: 'same-origin' }),
        ])
        if (!alive) return
        if (hRes.ok) {
          const h = await hRes.json()
          setHistory(Array.isArray(h?.history) ? h.history : [])
          setLoggedToday(!!h?.loggedToday)
        }
        if (iRes.ok) {
          const i = await iRes.json()
          if (i?.available && Array.isArray(i.insights)) setInsights(i.insights)
        }
      } catch (e) {
        console.error('[mood-strip] fetch failed (non-fatal):', e)
      } finally {
        if (alive) setReady(true)
      }
    })()
    return () => { alive = false }
  }, [])

  // Don't render an empty card before we know anything.
  if (!ready) return null
  const hasData = history.some((p) => p.mood != null || p.energy != null)
  if (!hasData && insights.length === 0) {
    return (
      <div data-testid="mood-strip" style={{
        background: 'var(--skin-card-bg, #FFFFFF)', border: '1px solid var(--skin-card-border, var(--color-border))',
        borderRadius: 'var(--skin-radius-card, 12px)', padding: '14px 20px', marginBottom: gapPx,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>
            No mood logged yet. Two taps at shutdown starts the loop.
          </span>
          <Link href="/dashboard/shutdown" style={{ fontSize: 12, color: 'var(--skin-color-accent, var(--color-accent))', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Shut down →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="mood-strip" style={{
      background: 'var(--skin-card-bg, #FFFFFF)', border: '1px solid var(--skin-card-border, var(--color-border))',
      borderRadius: 'var(--skin-radius-card, 12px)', padding: 20, marginBottom: gapPx,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 'var(--skin-typo-heading-weight, 700)', color: 'var(--skin-color-text, #221F1A)' }}>
          Mood &amp; energy
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>
            <span style={{ color: 'var(--skin-color-accent, var(--color-accent))' }}>■</span> mood{' '}
            <span style={{ color: 'var(--skin-color-primary, #4F7A52)' }}>■</span> energy
          </span>
          {loggedToday === false && (
            <Link href="/dashboard/shutdown" style={{ fontSize: 12, color: 'var(--skin-color-accent, var(--color-accent))', textDecoration: 'none' }}>
              Log today →
            </Link>
          )}
        </div>
      </div>

      {hasData && <Bars points={history} />}

      {insights.length > 0 && (
        <div data-testid="mood-insight" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--skin-card-border, var(--color-border))', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.map((ins, idx) => (
            <p key={idx} style={{ margin: 0, fontSize: 13, color: 'var(--skin-color-text-secondary, #221F1A)', lineHeight: 1.5 }}>
              <span style={{ marginRight: 6 }}>{DOMAIN_ICONS[ins.domain] ?? '•'}</span>
              {ins.text}
            </p>
          ))}
          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>
            An observation from your own logs, a pattern, not a prescription.
          </p>
        </div>
      )}
    </div>
  )
}
