'use client'

/**
 * GoalActions — edit a goal inline + convert a mis-filed goal to a task.
 * Rendered on the goal detail page header. PATCHes /api/goals/[id] and calls
 * /api/goals/[id]/convert-to-task, then refreshes / navigates.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HORIZONS, HORIZON_LABELS, type Horizon } from '@/lib/horizons'

interface Props {
  id: string
  name: string
  definition: string
  horizon: Horizon
  targetDate: string | null // yyyy-mm-dd
  status: string
}

const btn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'var(--color-text-primary)',
}
const input: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)',
  background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: 14, fontFamily: 'inherit',
}

export function GoalActions(p: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: p.name, definition: p.definition, horizon: p.horizon, targetDate: p.targetDate ?? '', status: p.status })

  async function save() {
    setBusy(true)
    try {
      await fetch(`/api/goals/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          definition: form.definition,
          horizon: form.horizon,
          status: form.status,
          targetDate: form.targetDate ? form.targetDate : null,
        }),
      })
      setEditing(false)
      router.refresh()
    } finally { setBusy(false) }
  }

  async function convert() {
    if (!window.confirm('Convert this goal to a task? It will move to your Tasks and the goal will be archived.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/goals/${p.id}/convert-to-task`, { method: 'POST' })
      if (res.ok) router.push('/dashboard/tasks')
    } finally { setBusy(false) }
  }

  if (!editing) {
    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button style={btn} onClick={() => setEditing(true)}>Edit goal</button>
        <button style={{ ...btn, color: 'var(--color-accent-2)' }} onClick={convert} disabled={busy} title="This is really a one-off task, not a goal">
          Convert to task
        </button>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 14, maxWidth: 520, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, display: 'grid', gap: 10 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Name
        <input style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Definition
        <textarea style={{ ...input, minHeight: 64, resize: 'vertical' }} value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} />
      </label>
      <div style={{ display: 'flex', gap: 10 }}>
        <label style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Horizon
          <select style={input} value={form.horizon} onChange={(e) => setForm({ ...form, horizon: e.target.value as Horizon })}>
            {HORIZONS.map((h) => <option key={h} value={h}>{HORIZON_LABELS[h]}</option>)}
          </select>
        </label>
        <label style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Target date
          <input type="date" style={input} value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
        </label>
        <label style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status
          <select style={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {['active', 'paused', 'completed', 'archived'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...btn, background: 'var(--color-accent)', color: '#fff', border: 'none' }} onClick={save} disabled={busy || !form.name.trim()}>{busy ? 'Saving…' : 'Save'}</button>
        <button style={btn} onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
      </div>
    </div>
  )
}
