/**
 * src/components/dashboard/GoalHygieneCard.tsx — the E-10 goal-hygiene
 * confrontation surface (backlog §5). Rendered on the weekly review surface.
 *
 * Shows each starving top-priority goal (rank ≤ 2, < 5% attention for 21 days)
 * with the three operable outcomes: RECOMMIT (auto-proposes a recurring block),
 * SHRINK (agent drafts a smaller goal), RETIRE (archive + a "goal funeral"
 * reflection — framed as a WIN of focus, never a failure).
 *
 * Data: GET /api/goals/hygiene → { starving: [...] }. Actions: POST the same
 * route { goalId, action }. Reactive (Clerk-authed) — no governor.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'

interface StarvingGoal {
  goalId: string
  name: string
  domainId: string
  rank: number
  avgShare: number
  starvedDays: number
  windowDays: number
}

const card: React.CSSProperties = {
  background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20, marginBottom: 16,
}
const btn: React.CSSProperties = {
  border: '1px solid var(--color-border)', borderRadius: 10, padding: '7px 12px', fontSize: 13,
  fontWeight: 600, cursor: 'pointer', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
}

export function GoalHygieneCard() {
  const [goals, setGoals] = useState<StarvingGoal[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/goals/hygiene')
      if (res.ok) setGoals((await res.json()).starving ?? [])
      else setGoals([])
    } catch { setGoals([]) }
  }, [])
  useEffect(() => { void load() }, [load])

  const act = useCallback(async (goalId: string, action: 'recommit' | 'shrink' | 'retire') => {
    setBusy(`${goalId}:${action}`)
    try {
      const res = await fetch('/api/goals/hygiene', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, action, note: note[goalId] }),
      })
      const out = await res.json().catch(() => ({}))
      if (action === 'shrink' && out?.shrinkDraft) {
        setNote((n) => ({ ...n, [goalId]: out.shrinkDraft }))
      } else {
        await load() // recommit/retire change the set
      }
    } finally {
      setBusy(null)
    }
  }, [note, load])

  if (goals === null) return null
  if (goals.length === 0) return null

  return (
    <div style={card}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-primary)' }}>Goal hygiene</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 14 }}>
        These top-priority goals have gone hungry. Choosing to retire one is a win of focus, not a failure.
      </p>
      {goals.map((g) => (
        <div key={g.goalId} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {g.name} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>· #{g.rank} priority</span>
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, margin: '4px 0 10px' }}>
            Under {Math.round(g.avgShare * 100)}% attention for {g.windowDays} straight days.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={btn} disabled={!!busy} onClick={() => act(g.goalId, 'recommit')}>
              {busy === `${g.goalId}:recommit` ? '…' : 'Recommit'}
            </button>
            <button style={btn} disabled={!!busy} onClick={() => act(g.goalId, 'shrink')}>
              {busy === `${g.goalId}:shrink` ? '…' : 'Shrink'}
            </button>
            <button style={{ ...btn, borderColor: '#D8B7A6', color: 'var(--color-accent-2)' }} disabled={!!busy} onClick={() => act(g.goalId, 'retire')}>
              {busy === `${g.goalId}:retire` ? '…' : 'Retire (a win of focus)'}
            </button>
          </div>
          {note[g.goalId] && (
            <div style={{ marginTop: 10, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 10, fontSize: 13, color: 'var(--color-text-primary)' }}>
              Suggested smaller version: {note[g.goalId]}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default GoalHygieneCard
