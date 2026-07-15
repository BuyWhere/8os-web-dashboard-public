/**
 * JournalClient — the actual write-and-read journal surface (Pro).
 *
 * Free-form: write whatever's on your mind, anytime, and it's saved as a
 * `free` JournalEntry via /api/journal. Past entries list below, newest first.
 * Entries are first-class signal for the nightly memory consolidation + goal
 * alignment (the Coach learns from them), so this also feeds the brain.
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type Entry = {
  id: string
  content: string
  kind: string
  mood: string | null
  entryDate: string
  createdAt: string
}

const KIND_LABEL: Record<string, string> = {
  free: '',
  shutdown_reflection: 'Evening reflection',
  weekly_reflection: 'Weekly review',
  gratitude: 'Gratitude',
}

function fmtDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}
function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function JournalClient() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [text, setText] = useState('')
  const [mood, setMood] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/journal?limit=200')
      if (r.ok) setEntries(await r.json())
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const save = useCallback(async () => {
    const content = text.trim()
    if (!content || saving) return
    setSaving(true); setError(null)
    try {
      const r = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, kind: 'free', mood: mood.trim() || null }),
      })
      if (!r.ok) { setError('Could not save. Please try again.'); return }
      setText(''); setMood('')
      await load()
      taRef.current?.focus()
    } catch { setError('Network error. Please try again.') } finally { setSaving(false) }
  }, [text, mood, saving, load])

  // Cmd/Ctrl+Enter to save.
  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void save() }
  }

  // Group entries by entryDate for readable day headers.
  const byDay: Array<{ day: string; items: Entry[] }> = []
  for (const e of entries) {
    const key = e.entryDate?.slice(0, 10) || e.createdAt?.slice(0, 10) || ''
    const last = byDay[byDay.length - 1]
    if (last && last.day === key) last.items.push(e)
    else byDay.push({ day: key, items: [e] })
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Write box */}
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 18, marginBottom: 28 }}>
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="What's on your mind? Write freely — anything you want to think through, note, or remember…"
          rows={5}
          style={{
            width: '100%', border: 'none', outline: 'none', resize: 'vertical',
            background: 'transparent', color: 'var(--color-text-primary)', fontSize: 15,
            lineHeight: 1.6, fontFamily: 'var(--font-sans), Inter, system-ui, sans-serif',
          }}
        />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
          <input
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="Mood (optional)"
            style={{ flex: '0 0 160px', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: 13 }}
          />
          {error && <span style={{ color: '#B5502F', fontSize: 13 }}>{error}</span>}
          <button
            onClick={save}
            disabled={!text.trim() || saving}
            style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 9, border: 'none', background: text.trim() ? 'var(--color-accent)' : 'var(--color-border)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: text.trim() ? 'pointer' : 'default' }}
          >
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>⌘/Ctrl + Enter to save. Your Coach reads your journal to understand you over time.</div>
      </div>

      {/* Entries */}
      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No entries yet. Your first thought goes above.</p>
      ) : (
        byDay.map((group) => (
          <div key={group.day} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              {fmtDay(group.day)}
            </div>
            {group.items.map((e) => (
              <div key={e.id} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{fmtTime(e.createdAt)}</span>
                  {KIND_LABEL[e.kind] && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-accent)', background: 'var(--color-bg-primary)', borderRadius: 999, padding: '1px 8px' }}>{KIND_LABEL[e.kind]}</span>}
                  {e.mood && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>· {e.mood}</span>}
                </div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>{e.content}</div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
