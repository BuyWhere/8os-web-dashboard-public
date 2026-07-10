'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ParsedFields {
  name: string
  domainId: string | null
  priority: 'low' | 'medium' | 'high'
  scheduledHour: number | null
  durationMinutes: number | null
  dayOffset: number
  notes: string | null
}

interface Preview {
  time: string | null
  endTime: string | null
  day: string | null
  durationMinutes: number | null
}

interface ParseResult {
  type: 'task' | 'drift'
  driftSignal?: boolean
  emotion?: string
  parsed?: ParsedFields
  preview?: Preview
  suggestions?: string[]
}

interface Props {
  onTaskAdded?: (result: { taskId: string; name: string }) => void
}

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1',
  wealth: '#f59e0b',
  health: '#22c55e',
  relationships: '#ec4899',
  learning: '#3b82f6',
  legacy: '#8b5cf6',
}

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'medium', label: 'Med', color: '#f59e0b' },
  { value: 'low', label: 'Low', color: '#6b7280' },
]

const DOMAIN_OPTIONS = [
  { value: 'health', label: 'Health' },
  { value: 'career', label: 'Career' },
  { value: 'relationships', label: 'Relations' },
  { value: 'wealth', label: 'Wealth' },
  { value: 'learning', label: 'Learning' },
  { value: 'legacy', label: 'Legacy' },
]

const DURATION_OPTIONS = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '1h' },
  { value: 90, label: '1.5h' },
  { value: 120, label: '2h' },
]

export function QuickAdd({ onTaskAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [parsed, setParsed] = useState<ParsedFields | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [driftResult, setDriftResult] = useState<{ emotion?: string; suggestions?: string[] } | null>(null)
  const [confirmingSuccess, setConfirmingSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const parseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setParsed(null)
      setPreview(null)
      setDriftResult(null)
      setConfirming(false)
      setConfirmingSuccess(false)
      setInput('')
    }
  }, [open])

  // Parse on input change with debounce
  const handleInputChange = useCallback(async (value: string) => {
    setInput(value)
    setConfirmingSuccess(false)

    if (!value.trim()) {
      setParsed(null)
      setPreview(null)
      setDriftResult(null)
      setConfirming(false)
      return
    }

    if (parseTimeoutRef.current) clearTimeout(parseTimeoutRef.current)
    parseTimeoutRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/nlp/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: value }),
        })
        const data: ParseResult = await res.json()

        if (data.type === 'drift' && data.driftSignal) {
          setDriftResult({ emotion: data.emotion, suggestions: data.suggestions })
          setParsed(null)
          setPreview(null)
          setConfirming(false)
        } else if (data.parsed) {
          setParsed(data.parsed)
          setPreview(data.preview ?? null)
          setDriftResult(null)
          setConfirming(true) // Show confirm chips
        }
      } catch {
        // Silently fail on parse errors
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  // Update a specific parsed field
  function updateField<K extends keyof ParsedFields>(key: K, value: ParsedFields[K]) {
    setParsed((prev) => prev ? { ...prev, [key]: value } : null)
  }

  // Confirm and create task
  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!parsed || !input.trim() || confirming) return

    setConfirming(true)
    setLoading(true)
    try {
      const res = await fetch('/api/nlp/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, ...parsed }),
      })
      const data = await res.json()
      if (data.task) {
        setConfirmingSuccess(true)
        onTaskAdded?.({ taskId: data.task.id, name: data.task.name })
        setTimeout(() => {
          setOpen(false)
        }, 2000)
      }
    } catch {
      // Error handled below
    } finally {
      setLoading(false)
    }
  }

  // Chip editor for a field
  function ChipSelector<T extends string | number>({
    value,
    options,
    onChange,
    colorFn,
  }: {
    value: T | null
    options: { value: T; label: string; color?: string }[]
    onChange: (v: T) => void
    colorFn?: (v: T) => string
  }) {
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const isSelected = value === opt.value
          const color = opt.color ?? colorFn?.(opt.value) ?? '#6b7280'
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                padding: '3px 10px',
                borderRadius: 20,
                border: isSelected ? `1.5px solid ${color}` : '1px solid #333',
                background: isSelected ? color + '22' : '#1a1a1a',
                color: isSelected ? color : '#888',
                fontSize: 12,
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        title="Quick Add (⌘K)"
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 100,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(99,102,241,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: '#fff',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        +
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12vh',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            style={{
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: 16,
              width: '100%',
              maxWidth: 560,
              padding: '20px 24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <form onSubmit={handleConfirm}>
              {/* Input Row */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  borderBottom: confirming && parsed ? '1px solid #2a2a2a' : 'none',
                  paddingBottom: confirming && parsed ? 16 : 0,
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>✦</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder='Try "call investor fri 3pm high"'
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#ededed',
                    fontSize: 16,
                    fontFamily: 'inherit',
                  }}
                  disabled={loading}
                />
                {loading && <span style={{ color: '#888', fontSize: 13 }}>...</span>}
                {confirmingSuccess && (
                  <span style={{ color: '#22c55e', fontSize: 18 }}>✓</span>
                )}
              </div>

              {/* Confirm Chips */}
              {confirming && parsed && !confirmingSuccess && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Priority */}
                  <div>
                    <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Priority
                    </div>
                    <ChipSelector
                      value={parsed.priority}
                      options={PRIORITY_OPTIONS}
                      onChange={(v) => updateField('priority', v)}
                      colorFn={(v) => PRIORITY_OPTIONS.find((o) => o.value === v)?.color ?? '#6b7280'}
                    />
                  </div>

                  {/* Domain */}
                  <div>
                    <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Domain
                    </div>
                    <ChipSelector
                      value={parsed.domainId ?? null}
                      options={[{ value: '', label: 'None' }, ...DOMAIN_OPTIONS]}
                      onChange={(v) => updateField('domainId', v === '' ? null : v as any)}
                      colorFn={(v) => v && v !== '' ? DOMAIN_COLORS[v as string] ?? '#6b7280' : '#6b7280'}
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Duration
                    </div>
                    <ChipSelector
                      value={parsed.durationMinutes ?? null}
                      options={DURATION_OPTIONS}
                      onChange={(v) => updateField('durationMinutes', v)}
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Time
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={parsed.scheduledHour ?? ''}
                        onChange={(e) =>
                          updateField(
                            'scheduledHour',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        placeholder="—"
                        style={{
                          width: 60,
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid #333',
                          background: '#1a1a1a',
                          color: '#ededed',
                          fontSize: 13,
                          fontFamily: 'inherit',
                          outline: 'none',
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ color: '#888', fontSize: 12 }}>hour (0-23)</span>
                      <span style={{ color: '#888', fontSize: 12 }}>·</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[0, 1, 2].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => updateField('dayOffset', d)}
                            style={{
                              padding: '3px 10px',
                              borderRadius: 20,
                              border: parsed.dayOffset === d ? '1.5px solid #6366f1' : '1px solid #333',
                              background: parsed.dayOffset === d ? '#6366f122' : '#1a1a1a',
                              color: parsed.dayOffset === d ? '#a5b4fc' : '#666',
                              fontSize: 12,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `+${d}d`}
                          </button>
                        ))}
                      </div>
                      {preview?.time && (
                        <span style={{ color: '#888', fontSize: 12 }}>
                          → {preview.time}{preview.endTime ? `-${preview.endTime}` : ''} {preview.day}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      marginTop: 8,
                      padding: '10px 20px',
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      border: 'none',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    {loading ? 'Adding...' : 'Add Task'}
                  </button>
                </div>
              )}

              {/* Success State */}
              {confirmingSuccess && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: '#1a1a1a',
                    border: '1px solid #22c55e44',
                  }}
                >
                  <div style={{ color: '#22c55e', fontWeight: 600 }}>
                    ✓ Task added
                  </div>
                </div>
              )}

              {/* Drift Signal */}
              {driftResult && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: '#1a1a1a',
                    border: '1px solid #f59e0b44',
                  }}
                >
                  <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 8 }}>
                    💛 Let's pause here
                  </div>
                  {driftResult.suggestions && (
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {driftResult.suggestions.map((s, i) => (
                        <li
                          key={i}
                          style={{ color: '#aaa', fontSize: 13, marginBottom: 4, paddingLeft: 12 }}
                        >
                          → {s}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      marginTop: 12,
                      padding: '6px 16px',
                      borderRadius: 6,
                      background: '#1e1e1e',
                      border: '1px solid #333',
                      color: '#ededed',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontFamily: 'inherit',
                    }}
                  >
                    Got it
                  </button>
                </div>
              )}
            </form>

            {/* Example chips */}
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['call investor fri 3pm high', 'Gym tomorrow at 7am', 'Read for 30 minutes'].map(
                (ex) => (
                  <button
                    key={ex}
                    onClick={() => handleInputChange(ex)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      color: '#888',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {ex}
                  </button>
                )
              )}
            </div>
            <div style={{ marginTop: 10, color: '#888', fontSize: 11 }}>
              Press ⌘K to open · Esc to close
            </div>
          </div>
        </div>
      )}
    </>
  )
}
