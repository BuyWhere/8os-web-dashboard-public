'use client'

/**
 * GoalComposer — client-side "Add goals" affordance for the /goals page.
 *
 * Two modes in one panel:
 *   • Single — one goal with a horizon + domain + optional target date.
 *   • Bulk   — paste several lines; each becomes a goal in the chosen horizon
 *              (the owner "uploads my weekly / monthly / yearly goals").
 *
 * Warm-editorial styling via --color-* theme vars so it works in light/dark.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HORIZONS, HORIZON_LABELS, DEFAULT_HORIZON, type Horizon } from '@/lib/horizons'

const DOMAINS = ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'] as const

export function GoalComposer({ initialHorizon }: { initialHorizon?: Horizon }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [horizon, setHorizon] = useState<Horizon>(initialHorizon ?? DEFAULT_HORIZON)
  const [domainId, setDomainId] = useState<(typeof DOMAINS)[number]>('career')
  const [name, setName] = useState('')
  const [definition, setDefinition] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName(''); setDefinition(''); setTargetDate(''); setBulkText(''); setError(null)
  }

  async function submitSingle() {
    if (!name.trim()) { setError('Give the goal a name.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId,
          name: name.trim(),
          definition: definition.trim() || name.trim(),
          checkMethod: 'binary',
          horizon,
          targetDate: targetDate || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create goal')
      reset(); setOpen(false); router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function submitBulk() {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) { setError('Paste at least one goal (one per line).'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/goals/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horizon, domainId, text: bulkText, targetDate: targetDate || null }),
      })
      if (!res.ok) throw new Error('Failed to add goals')
      reset(); setOpen(false); router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const bulkCount = bulkText.split('\n').map((l) => l.trim()).filter(Boolean).length

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 11px', borderRadius: 9,
    border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)', fontSize: 13.5, fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 5, display: 'block',
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '9px 16px', borderRadius: 10, border: '1px solid var(--color-border-strong)',
          background: 'var(--color-accent)', color: '#fff', fontSize: 13.5, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + Add goals
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,17,12,0.42)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8vh 16px',
      }}
      onClick={() => !saving && setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)', borderRadius: 16, padding: 24,
          boxShadow: '0 24px 64px rgba(20,17,12,0.28)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            Add goals
          </h2>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 3, marginBottom: 18 }}>
          {(['single', 'bulk'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                background: mode === m ? 'var(--color-accent)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {m === 'single' ? 'One goal' : 'Bulk paste'}
            </button>
          ))}
        </div>

        {/* Horizon + domain row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Horizon</label>
            <select value={horizon} onChange={(e) => setHorizon(e.target.value as Horizon)} style={inputStyle}>
              {HORIZONS.map((h) => (<option key={h} value={h}>{HORIZON_LABELS[h]}</option>))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Domain</label>
            <select value={domainId} onChange={(e) => setDomainId(e.target.value as (typeof DOMAINS)[number])} style={inputStyle}>
              {DOMAINS.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
        </div>

        {mode === 'single' ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Goal</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ship the v2 landing page" style={inputStyle} autoFocus />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Definition (optional)</label>
              <textarea value={definition} onChange={(e) => setDefinition(e.target.value)} placeholder="What does done look like?" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>One goal per line {bulkCount > 0 && `· ${bulkCount} goal${bulkCount === 1 ? '' : 's'}`}</label>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"Finish Q3 board deck\nRun 3x this week\nCall two investors"}
              rows={7}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              autoFocus
            />
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 6 }}>
              Each line becomes a {HORIZON_LABELS[horizon].toLowerCase()} goal. Bullet or number prefixes are stripped.
            </div>
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Target date (optional)</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }} />
        </div>

        {error && <div style={{ color: 'var(--color-accent-2)', fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => setOpen(false)} disabled={saving} style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 13.5, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={mode === 'single' ? submitSingle : submitBulk}
            disabled={saving}
            style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : mode === 'single' ? 'Add goal' : `Add ${bulkCount || ''} goal${bulkCount === 1 ? '' : 's'}`.trim()}
          </button>
        </div>
      </div>
    </div>
  )
}
