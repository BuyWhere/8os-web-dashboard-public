'use client'

/**
 * CaptureBar — universal global quick-capture.
 * Present across all dashboard pages (mounted in (dashboard)/layout.tsx).
 * Type any free text ("call investor fri 3pm", "idea: launch a podcast") and it
 * is turned into the right OS object (task or goal) via /api/capture, which uses
 * the assistant tool-calling path. Shows a confirmation of what was created.
 */

import { useState, useRef, useEffect } from 'react'

interface CaptureResult {
  kind: 'task' | 'goal'
  object: { id: string; name: string }
  confirmation: string
  color?: string | null
}

export default function CaptureBar() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CaptureResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cmd/Ctrl+Shift+K focuses the capture bar from anywhere.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current) }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Capture failed. Try again.')
      } else {
        setResult(data as CaptureResult)
        setInput('')
        // Refresh server components (task/goal lists) to reflect the new object.
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('os-capture', { detail: data }))
        }
        if (dismissTimer.current) clearTimeout(dismissTimer.current)
        dismissTimer.current = setTimeout(() => setResult(null), 6000)
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        width: 'min(620px, calc(100vw - 48px))',
        pointerEvents: 'none',
      }}
    >
      {/* Confirmation toast */}
      {(result || error) && (
        <div
          style={{
            pointerEvents: 'auto',
            marginBottom: 10,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'var(--color-bg-card)',
            border: `1px solid ${error ? '#B5502F' : (result?.color ?? '#4F7A52') + '88'}`,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {error ? (
            <span style={{ color: '#B5502F', fontSize: 13 }}>⚠ {error}</span>
          ) : (
            <>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '3px 8px',
                  borderRadius: 6,
                  color: result?.color ?? '#4F7A52',
                  background: (result?.color ?? '#4F7A52') + '1f',
                  flexShrink: 0,
                }}
              >
                {result?.kind === 'goal' ? '◎ Goal' : '✓ Task'}
              </span>
              <span style={{ color: 'var(--color-text-primary)', fontSize: 13, flex: 1 }}>{result?.confirmation}</span>
            </>
          )}
          <button
            onClick={() => { setResult(null); setError(null) }}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Capture input */}
      <form
        onSubmit={submit}
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 8px 8px 16px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
        }}
      >
        <span style={{ fontSize: 16, color: 'var(--color-accent)', flexShrink: 0 }}>✦</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Capture anything, 'call investor fri 3pm' or 'idea: launch a podcast'"
          disabled={loading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--color-text-primary)',
            fontSize: 14,
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderRadius: 9,
            border: 'none',
            cursor: loading || !input.trim() ? 'default' : 'pointer',
            background: loading || !input.trim()
              ? 'var(--color-border)'
              : 'linear-gradient(135deg, var(--color-accent), var(--color-accent))',
            color: loading || !input.trim() ? 'var(--color-text-muted)' : '#FFFFFF',
            fontSize: 13,
            fontWeight: 600,
            transition: 'all 0.15s',
          }}
        >
          {loading ? 'Capturing…' : 'Capture'}
        </button>
      </form>
    </div>
  )
}
