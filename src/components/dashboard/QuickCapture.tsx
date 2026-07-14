/**
 * QuickCapture — inline one-line task capture (POST /api/tasks/quick-capture).
 * Enter a name, pick an energy/priority, hit enter → lands in the inbox.
 * Lives as a sticky bar at the bottom of the Today view.
 */
'use client'

import { useState, useCallback, type FormEvent } from 'react'
import { ENERGY_COLORS, ENERGY_LABELS, type EnergyLevel } from '@/types/today'

interface Props {
  onCaptured?: () => void
}

const PRIORITY_FOR: Record<EnergyLevel, 'high' | 'medium' | 'low'> = {
  green: 'high',
  yellow: 'medium',
  red: 'low',
}

export function QuickCapture({ onCaptured }: Props) {
  const [name, setName] = useState('')
  const [energy, setEnergy] = useState<EnergyLevel>('green')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const trimmed = name.trim()
      if (!trimmed || busy) return
      setBusy(true)
      setErr(null)
      try {
        const res = await fetch('/api/tasks/quick-capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed, energyLevel: energy, priority: PRIORITY_FOR[energy] }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? 'Capture failed')
        }
        setName('')
        setFlash('Captured ✓')
        onCaptured?.()
        setTimeout(() => setFlash(null), 1600)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not capture task')
      } finally {
        setBusy(false)
      }
    },
    [name, energy, busy, onCaptured],
  )

  return (
    <form
      onSubmit={submit}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        background: 'var(--skin-card-bg, #FFFFFF)',
        border: '1px solid var(--skin-color-border, var(--color-border))',
        borderRadius: 'var(--skin-radius-card, 12px)',
      }}
    >
      <span style={{ fontSize: 16, opacity: 0.6 }}>⚡</span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Quick capture a task… (enter to save)"
        disabled={busy}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--skin-color-text, #221F1A)',
          fontSize: 14,
        }}
      />
      <div style={{ display: 'flex', gap: 4 }}>
        {(['green', 'yellow', 'red'] as EnergyLevel[]).map((lvl) => (
          <button
            key={lvl}
            type="button"
            title={`${ENERGY_LABELS[lvl]} energy`}
            onClick={() => setEnergy(lvl)}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: energy === lvl ? '2px solid #fff' : '2px solid transparent',
              background: ENERGY_COLORS[lvl],
              opacity: energy === lvl ? 1 : 0.4,
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
      <button
        type="submit"
        disabled={busy || !name.trim()}
        style={{
          background: 'var(--skin-button-primary-bg, var(--color-accent))',
          color: 'var(--skin-button-primary-text, #fff)',
          border: 'none',
          borderRadius: 'var(--skin-radius-button, 6px)',
          padding: '7px 14px',
          fontSize: 12,
          fontWeight: 700,
          cursor: busy || !name.trim() ? 'default' : 'pointer',
          opacity: busy || !name.trim() ? 0.5 : 1,
        }}
      >
        {flash ?? (busy ? '…' : 'Capture')}
      </button>
      {err ? (
        <span style={{ position: 'absolute', bottom: 52, right: 14, fontSize: 11, color: ENERGY_COLORS.red }}>
          {err}
        </span>
      ) : null}
    </form>
  )
}
