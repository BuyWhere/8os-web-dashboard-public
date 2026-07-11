/**
 * InboxList — unscheduled tasks grouped by energy window (GET /api/inbox).
 * Each item is a compact TaskCard; tapping "Plan" schedules it into today via
 * the existing /api/schedule endpoint. Empties gracefully when nothing waits.
 */
'use client'

import { useState, useCallback, useEffect } from 'react'
import { TaskCard } from './TaskCard'
import {
  ENERGY_COLORS,
  ENERGY_LABELS,
  type EnergyLevel,
  type InboxTask,
} from '@/types/today'

interface Props {
  /** Optional pre-fetched tasks (skips the fetch). */
  initialTasks?: InboxTask[]
  onChanged?: () => void
}

export function InboxList({ initialTasks, onChanged }: Props) {
  const [tasks, setTasks] = useState<InboxTask[]>(initialTasks ?? [])
  const [loading, setLoading] = useState(!initialTasks)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox', { cache: 'no-store' })
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch {
      setErr('Could not load inbox.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialTasks) load()
  }, [initialTasks, load])

  async function planIntoToday(task: InboxTask) {
    if (busyId) return
    setBusyId(task.id)
    setErr(null)
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, searchFrom: new Date().toISOString(), searchDays: 1 }),
      })
      if (!res.ok) throw new Error('Could not schedule')
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
      onChanged?.()
    } catch {
      setErr('Could not place that task today.')
    } finally {
      setBusyId(null)
    }
  }

  const grouped: Record<EnergyLevel, InboxTask[]> = { green: [], yellow: [], red: [] }
  for (const t of tasks) grouped[t.energyRequired].push(t)
  const order: EnergyLevel[] = ['green', 'yellow', 'red']

  if (loading) {
    return <div style={{ color: 'var(--skin-color-text-muted, #666)', fontSize: 13 }}>Loading inbox…</div>
  }

  return (
    <div>
      {err ? (
        <div style={{ fontSize: 12, color: ENERGY_COLORS.red, marginBottom: 8 }}>{err}</div>
      ) : null}

      {tasks.length === 0 ? (
        <div style={{ color: 'var(--skin-color-text-muted, #666)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          Inbox zero — nothing waiting to be scheduled.
        </div>
      ) : (
        order.map((tier) =>
          grouped[tier].length === 0 ? null : (
            <div key={tier} style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: ENERGY_COLORS[tier],
                  marginBottom: 8,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ENERGY_COLORS[tier] }} />
                {ENERGY_LABELS[tier]} energy · {grouped[tier].length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grouped[tier].map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <TaskCard task={{ ...t, scheduledAt: null }} compact onChanged={load} />
                    </div>
                    <button
                      onClick={() => planIntoToday(t)}
                      disabled={!!busyId}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--skin-button-secondary-border, #333)',
                        borderRadius: 'var(--skin-radius-button, 6px)',
                        color: 'var(--skin-button-secondary-text, #a5b4fc)',
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: busyId ? 'default' : 'pointer',
                        opacity: busyId === t.id ? 0.5 : 1,
                        flexShrink: 0,
                      }}
                    >
                      {busyId === t.id ? '…' : 'Plan'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ),
        )
      )}
    </div>
  )
}
