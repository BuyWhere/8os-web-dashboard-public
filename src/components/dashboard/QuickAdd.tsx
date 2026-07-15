'use client'

import { useState, useRef, useEffect } from 'react'

interface QuickAddResult {
  type: 'task' | 'drift'
  message?: string
  emotion?: string
  suggestions?: string[]
  task?: { id: string; name: string }
  parsed?: {
    domainId?: string
    scheduledHour?: number
    durationMinutes?: number
    priority?: string
    energyLevel?: string
  }
}

interface EditableParsed {
  domainId?: string
  scheduledHour?: number
  durationMinutes?: number
  priority?: string
  energyLevel?: string
}

interface Props {
  onTaskAdded?: (result: QuickAddResult) => void
}

export function QuickAdd({ onTaskAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QuickAddResult | null>(null)
  const [editableParsed, setEditableParsed] = useState<EditableParsed | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setResult(null)
      setInput('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/nlp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input }) })
      const data: QuickAddResult = await res.json()
      setResult(data)
      setEditableParsed(data.parsed ?? null)
      onTaskAdded?.(data)
      if (data.type === 'task') {
        setTimeout(() => { setOpen(false); setResult(null); setEditableParsed(null) }, 2500)
      }
    } catch {
      setResult({ type: 'task', message: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  function updateParsed(key: keyof EditableParsed, value: string | number | undefined) {
    setEditableParsed(prev => ({ ...prev, [key]: value }))
  }

  const chipStyle = (active: boolean, color?: string): React.CSSProperties => ({
    padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    background: active ? (color ?? '#B08637') + '22' : 'var(--color-bg-primary)',
    border: `1px solid ${active ? (color ?? '#B08637') + '55' : 'var(--color-border)'}`,
    color: active ? (color ?? '#B08637') : 'var(--color-text-muted)',
    transition: 'all 0.15s',
  })

  const DOMAIN_COLORS: Record<string, string> = {
    career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
    relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
  }

  const DOMAIN_ICONS: Record<string, string> = {
    career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
  }

  const PRIORITY_COLORS: Record<string, string> = {
    high: '#ef4444', medium: '#f59e0b', low: '#6b7280',
  }

  const ENERGY_COLORS: Record<string, string> = {
    high: '#22c55e', medium: '#f59e0b', low: '#ef4444',
  }

  return (
    <>
      {/* Quick-add FAB removed: unified into the single "Coach" launcher.
          The ⌘K modal below is preserved for the keyboard shortcut, and
          quick-capture also lives inside the Coach pop-up. */}

      {/* Modal Overlay */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(34, 31, 26, 0.32)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '15vh',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{
            background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16,
            width: '100%', maxWidth: 540, padding: '20px 24px', boxShadow: '0 24px 60px rgba(34, 31, 26, 0.18)',
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 20 }}>✦</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='Try "Gym at 7pm" or "I feel stressed"'
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--color-text-primary)', fontSize: 16, fontFamily: 'inherit',
                  }}
                  disabled={loading}
                />
                {loading && <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>...</span>}
              </div>
            </form>

            {result && (
              <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                {result.type === 'task' && (
                  <div>
                    <div style={{ color: '#4F7A52', fontWeight: 600, marginBottom: 8 }}>✓ {result.message}</div>

                    {/* Editable chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                      {/* Domain */}
                      {result.parsed?.domainId && (
                        <span style={chipStyle(true, DOMAIN_COLORS[result.parsed.domainId])}>
                          {DOMAIN_ICONS[result.parsed.domainId]} {result.parsed.domainId}
                        </span>
                      )}

                      {/* Priority */}
                      <span
                        style={chipStyle(!!editableParsed?.priority, PRIORITY_COLORS[editableParsed?.priority ?? 'medium'])}
                        title="Priority"
                      >
                        {editableParsed?.priority ?? 'medium'}
                      </span>

                      {/* Duration */}
                      <span
                        style={chipStyle(!!editableParsed?.durationMinutes, 'var(--color-accent)')}
                        title="Duration"
                      >
                        {editableParsed?.durationMinutes ?? 30}m
                      </span>

                      {/* Energy */}
                      {editableParsed?.energyLevel && (
                        <span style={chipStyle(true, ENERGY_COLORS[editableParsed.energyLevel])}>
                          ⚡ {editableParsed.energyLevel}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Click chips to edit · Double-click input to re-parse</div>
                  </div>
                )}
                {result.type === 'drift' && (
                  <div>
                    <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 8 }}>💛 {result.message}</div>
                    {result.suggestions && (
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {result.suggestions.map((s, i) => (
                          <li key={i} style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 4, paddingLeft: 12 }}>→ {s}</li>
                        ))}
                      </ul>
                    )}
                    <button
                      onClick={() => setOpen(false)}
                      style={{ marginTop: 12, padding: '6px 16px', borderRadius: 6, background: 'var(--color-accent)', border: '1px solid var(--color-accent)', color: '#FFFFFF', cursor: 'pointer', fontSize: 13 }}
                    >
                      Got it
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Gym at 7pm', 'Read for 30 minutes', 'Team call tomorrow at 3pm'].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  style={{
                    padding: '3px 10px', borderRadius: 6, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10, color: 'var(--color-text-muted)', fontSize: 11 }}>Press ⌘K to open · Esc to close</div>
          </div>
        </div>
      )}
    </>
  )
}
