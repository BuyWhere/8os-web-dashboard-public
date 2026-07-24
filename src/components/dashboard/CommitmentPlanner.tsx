/**
 * CommitmentPlanner — surfaces the commitments the Coach/journal captured (things
 * the user SAID they'd do, with times) as one-pass calendar proposals. Renders
 * nothing when there's nothing to propose. Approving creates the events via
 * /api/journal/apply, which stamps each commitment so it's proposed only once.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'

type Proposal = { commitmentId: string; title: string; startTime: string; endTime?: string; source: string }

function fmtWhen(iso?: string): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) } catch { return '' }
}

export function CommitmentPlanner() {
  const [events, setEvents] = useState<Proposal[]>([])
  const [applying, setApplying] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/commitments/proposals')
        if (r.ok && !cancelled) {
          const d = await r.json()
          setEvents(Array.isArray(d.events) ? d.events : [])
        }
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
  }, [])

  const apply = useCallback(async () => {
    if (!events.length || applying) return
    setApplying(true)
    try {
      const r = await fetch('/api/journal/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      })
      if (r.ok) {
        const d = await r.json()
        setDone(`Added ${d?.created?.events ?? 0} event(s) to your calendar.`)
        setEvents([])
        // Refresh the server-rendered calendar behind this card.
        setTimeout(() => window.location.reload(), 900)
      }
    } catch { /* silent */ } finally { setApplying(false) }
  }, [events, applying])

  if (dismissed || (!events.length && !done)) return null

  return (
    <div style={{ margin: '12px 16px 0', background: 'var(--color-bg-card)', border: '1px solid var(--color-accent)', borderRadius: 12, padding: '14px 16px' }}>
      {done ? (
        <div style={{ fontSize: 13, color: '#4F7A52' }}>{done}</div>
      ) : (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>
            You mentioned these to your Coach — put them on the calendar?
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>Remove any you don’t want, then add the rest in one go.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {events.map((e, i) => (
              <div key={e.commitmentId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-primary)', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 10px' }}>
                <span style={{ flex: 1 }}>{e.title} <span style={{ color: 'var(--color-text-muted)' }}>· {fmtWhen(e.startTime)}</span></span>
                <button onClick={() => setEvents((p) => p.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 15 }} aria-label={`Remove ${e.title}`}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={apply} disabled={applying || !events.length}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {applying ? 'Adding…' : `Add ${events.length} to calendar`}
            </button>
            <button onClick={() => setDismissed(true)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  )
}
