/**
 * TaskCard — a single task row used by the Today view and inbox.
 * Shows energy badge, priority dot, scheduled time, inline complete, and
 * snooze / reschedule controls (POST /api/tasks/[id]/{snooze,reschedule}).
 * Archetype-skinned via --skin-* CSS variables.
 */
'use client'

import { useState, useCallback } from 'react'
import {
  ENERGY_COLORS,
  ENERGY_LABELS,
  PRIORITY_COLORS,
  fmtTime,
  fmtDuration,
  type TodayTask,
} from '@/types/today'

interface Props {
  task: TodayTask
  /** Hide the snooze/reschedule actions (e.g. in compact inbox lists). */
  compact?: boolean
  /** Called after a mutation succeeds so the parent can refresh. */
  onChanged?: () => void
}

type MenuMode = null | 'snooze' | 'reschedule'

export function TaskCard({ task, compact = false, onChanged }: Props) {
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState<MenuMode>(null)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(task.status === 'done' || !!task.completedAt)

  const patch = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      setBusy(true)
      setErr(null)
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? 'Request failed')
        }
        setMenu(null)
        { onChanged?.() }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setBusy(false)
      }
    },
    [onChanged],
  )

  async function toggleComplete() {
    if (busy) return
    const nextDone = !done
    setDone(nextDone)
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextDone ? 'done' : 'todo' }),
      })
      if (!res.ok) {
        setDone(!nextDone)
        throw new Error('Could not update task')
      }
      { onChanged?.() }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update task')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--skin-radius-card, 10px)',
        background: 'var(--skin-card-bg, #FFFFFF)',
        border: '1px solid var(--skin-color-border, #E7DFD2)',
        opacity: done ? 0.6 : 1,
      }}
    >
      <button
        onClick={toggleComplete}
        disabled={busy}
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          border: `1px solid ${done ? ENERGY_COLORS.green : '#E7DFD2'}`,
          background: done ? ENERGY_COLORS.green : 'transparent',
          color: '#fff',
          fontSize: 13,
          lineHeight: '18px',
          cursor: busy ? 'default' : 'pointer',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {done ? '✓' : ''}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            color: done ? 'var(--skin-color-text-muted, #8A8175)' : 'var(--skin-color-text, #221F1A)',
            textDecoration: done ? 'line-through' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {task.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          {/* Energy badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: 4,
              color: ENERGY_COLORS[task.energyRequired],
              background: `${ENERGY_COLORS[task.energyRequired]}1a`,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ENERGY_COLORS[task.energyRequired] }} />
            {ENERGY_LABELS[task.energyRequired]}
          </span>
          <span style={{ fontSize: 11, color: 'var(--skin-color-text-muted, #8A8175)' }}>
            {task.scheduledAt ? `${fmtTime(task.scheduledAt)} · ` : ''}
            {fmtDuration(task.duration)}
          </span>
          {task.projectName ? (
            <span style={{ fontSize: 11, color: 'var(--skin-color-text-muted, #8A8175)' }}>{task.projectName}</span>
          ) : null}
        </div>

        {err ? (
          <div style={{ fontSize: 11, color: ENERGY_COLORS.red, marginTop: 4 }}>{err}</div>
        ) : null}

        {/* Inline snooze / reschedule panel */}
        {menu ? (
          <ActionPanel
            mode={menu}
            busy={busy}
            onCancel={() => setMenu(null)}
            onSubmit={(body) => patch(`/api/tasks/${task.id}/${menu}`, body)}
          />
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span
          style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[task.priority] ?? '#8A8175' }}
          title={`Priority: ${task.priority}`}
        />
        {!compact && !done ? (
          <>
            <CardButton label="Snooze" disabled={busy} onClick={() => setMenu(menu === 'snooze' ? null : 'snooze')} />
            <CardButton
              label="Move"
              disabled={busy}
              onClick={() => setMenu(menu === 'reschedule' ? null : 'reschedule')}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

function CardButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: '1px solid var(--skin-button-secondary-border, #E7DFD2)',
        borderRadius: 'var(--skin-radius-button, 6px)',
        color: 'var(--skin-button-secondary-text, #6B6257)',
        padding: '4px 8px',
        fontSize: 11,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {label}
    </button>
  )
}

/** Inline form for snooze (relative) and reschedule (absolute datetime). */
function ActionPanel({
  mode,
  busy,
  onCancel,
  onSubmit,
}: {
  mode: 'snooze' | 'reschedule'
  busy: boolean
  onCancel: () => void
  onSubmit: (body: Record<string, unknown>) => void
}) {
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('day')

  function handleSnooze() {
    const n = parseInt(value, 10)
    if (!n || n < 1) return
    onSubmit({ unit, value: n })
  }

  function handleReschedule() {
    if (!value) return
    // <input type="datetime-local"> → ISO string
    onSubmit({ scheduledAt: new Date(value).toISOString() })
  }

  if (mode === 'reschedule') {
    return (
      <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={inputStyle}
        />
        <MiniBtn label="Save" disabled={busy || !value} onClick={handleReschedule} primary />
        <MiniBtn label="Cancel" disabled={busy} onClick={onCancel} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
      <input
        type="number"
        min={1}
        placeholder="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ ...inputStyle, width: 56 }}
      />
      <select value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle}>
        <option value="minute">min</option>
        <option value="hour">hr</option>
        <option value="day">day</option>
        <option value="week">week</option>
      </select>
      <MiniBtn label="Snooze" disabled={busy || !value} onClick={handleSnooze} primary />
      <MiniBtn label="Cancel" disabled={busy} onClick={onCancel} />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E7DFD2',
  borderRadius: 6,
  color: '#221F1A',
  padding: '5px 8px',
  fontSize: 12,
}

function MiniBtn({
  label,
  disabled,
  onClick,
  primary,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: primary ? 'var(--skin-button-primary-bg, #B08637)' : 'transparent',
        color: primary ? 'var(--skin-button-primary-text, #fff)' : 'var(--skin-color-text-secondary, #6B6257)',
        border: `1px solid ${primary ? 'transparent' : 'var(--skin-button-secondary-border, #E7DFD2)'}`,
        borderRadius: 'var(--skin-radius-button, 6px)',
        padding: '5px 10px',
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}
