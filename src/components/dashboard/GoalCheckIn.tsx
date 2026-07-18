/**
 * GoalCheckIn — the moment of reckoning for goals whose deadline has passed.
 *
 * A weekly goal ends on Sunday; without this, "goals for the week" just lingered
 * with no completion check. Active goals past their target date surface here:
 * mark Completed, extend into the next period, or archive. One row each, gone
 * once answered.
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { defaultTargetDate, HORIZON_LABELS, type Horizon } from '@/lib/horizons'

interface EndedGoal {
  id: string
  name: string
  horizon: Horizon
  targetDate: string // yyyy-mm-dd
}

const NEXT_LABEL: Record<Horizon, string> = {
  weekly: 'next week', monthly: 'next month', quarterly: 'next quarter',
  yearly: 'next year', three_year: '3 more years', five_year: '5 more years',
}

export function GoalCheckIn({ goals }: { goals: EndedGoal[] }) {
  const router = useRouter()
  const [remaining, setRemaining] = useState<EndedGoal[]>(goals)
  const [busy, setBusy] = useState<string | null>(null)

  if (remaining.length === 0) return null

  async function act(g: EndedGoal, patch: Record<string, unknown>) {
    if (busy) return
    setBusy(g.id)
    try {
      const res = await fetch(`/api/goals/${g.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        setRemaining(prev => prev.filter(x => x.id !== g.id))
        router.refresh()
      }
    } catch { /* row stays; user can retry */ }
    setBusy(null)
  }

  function extend(g: EndedGoal) {
    const now = new Date()
    const next = defaultTargetDate(g.horizon, { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() })
    void act(g, { targetDate: next })
  }

  const btn: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 7,
    border: '1px solid var(--color-border)', background: 'transparent',
    color: 'var(--color-text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap',
  }

  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-accent)', borderRadius: 14, padding: '16px 18px', marginBottom: 24 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 2 }}>
        {remaining.length === 1 ? 'A goal reached its end date' : `${remaining.length} goals reached their end date`}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 12 }}>
        The period is over. How did it go?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {remaining.map((g) => (
          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '9px 12px' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text-primary)' }}>{g.name}</span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                {' '}· {HORIZON_LABELS[g.horizon]} · ended {new Date(g.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                disabled={busy === g.id}
                onClick={() => act(g, { status: 'completed', progress: 1 })}
                style={{ ...btn, background: '#4F7A52', border: 'none', color: '#fff' }}
              >
                ✓ Completed
              </button>
              <button disabled={busy === g.id} onClick={() => extend(g)} style={btn}>
                → Extend to {NEXT_LABEL[g.horizon]}
              </button>
              <button
                disabled={busy === g.id}
                onClick={() => act(g, { status: 'archived' })}
                style={{ ...btn, color: 'var(--color-text-muted)' }}
              >
                Didn&apos;t happen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
