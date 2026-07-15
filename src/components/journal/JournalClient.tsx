/**
 * JournalClient — write/speak your mind, read past entries, and confirm what the
 * brain extracted.
 *
 * - Free-write OR continuous on-device voice (Web Speech API — free, no server STT;
 *   auto-restarts through pauses so you can keep talking).
 * - On save, an extraction pass runs: memories/people are learned automatically;
 *   newly-created tasks / events / goals / contact follow-ups come back as a ONE-PASS
 *   review you approve or trim in a single click (no item-by-item approving).
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type Entry = { id: string; content: string; kind: string; mood: string | null; entryDate: string; createdAt: string }
type Proposals = {
  tasks: Array<{ name?: string; scheduledAt?: string | null; goalId?: string | null }>
  events: Array<{ title?: string; startTime?: string; endTime?: string }>
  goals: Array<{ name?: string; horizon?: string; domainId?: string }>
  relationshipFollowups: Array<{ person?: string; action?: string; when?: string | null }>
}

const KIND_LABEL: Record<string, string> = {
  free: '', shutdown_reflection: 'Evening reflection', weekly_reflection: 'Weekly review', gratitude: 'Gratitude',
}
function fmtDay(iso: string): string { try { return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) } catch { return iso.slice(0, 10) } }
function fmtTime(iso: string): string { try { return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) } catch { return '' } }
function fmtWhen(iso?: string | null): string { if (!iso) return ''; try { const d = new Date(iso); return ' · ' + d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '' } }

export function JournalClient() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [text, setText] = useState('')
  const [mood, setMood] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [proposals, setProposals] = useState<Proposals | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState<string | null>(null)

  const taRef = useRef<HTMLTextAreaElement>(null)
  const recRef = useRef<any>(null)
  const recordingRef = useRef(false)
  const baseRef = useRef('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch('/api/journal?limit=200'); if (r.ok) setEntries(await r.json()) } catch {} finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const save = useCallback(async () => {
    const content = text.trim()
    if (!content || saving) return
    setSaving(true); setError(null); setApplied(null)
    try {
      const r = await fetch('/api/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, kind: 'free', mood: mood.trim() || null }) })
      if (!r.ok) { setError('Could not save. Please try again.'); return }
      setText(''); setMood(''); baseRef.current = ''
      await load()
      taRef.current?.focus()
      // Extraction pass (memories auto-learned; new items returned for confirm).
      setExtracting(true)
      try {
        const ex = await fetch('/api/journal/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
        if (ex.ok) {
          const data = await ex.json()
          const p = data.proposals as Proposals
          const any = p && (p.tasks?.length || p.events?.length || p.goals?.length || p.relationshipFollowups?.length)
          setProposals(any ? p : null)
        }
      } catch {} finally { setExtracting(false) }
    } catch { setError('Network error. Please try again.') } finally { setSaving(false) }
  }, [text, mood, saving, load])

  function onKeyDown(e: React.KeyboardEvent) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void save() } }

  // ── Continuous on-device voice ────────────────────────────────────────────
  const stopMic = useCallback(() => { recordingRef.current = false; try { recRef.current?.stop() } catch {}; setRecording(false) }, [])
  const startMic = useCallback(() => {
    const SR = (typeof window !== 'undefined') && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    if (!SR) { setError('Voice input isn’t supported in this browser. Try Chrome, or type.'); return }
    const rec = new SR()
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'
    baseRef.current = text ? text.replace(/\s+$/, '') + ' ' : ''
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript
        if (e.results[i].isFinal) baseRef.current += seg + ' '
        else interim += seg
      }
      setText(baseRef.current + interim)
    }
    rec.onend = () => { if (recordingRef.current) { try { rec.start() } catch {} } else setRecording(false) }
    rec.onerror = (e: any) => { if (e?.error === 'not-allowed') { setError('Microphone permission denied.'); stopMic() } }
    recRef.current = rec; recordingRef.current = true; setRecording(true); setError(null)
    try { rec.start() } catch {}
  }, [text, stopMic])
  useEffect(() => () => { recordingRef.current = false; try { recRef.current?.stop() } catch {} }, [])

  // ── One-pass proposal review ──────────────────────────────────────────────
  function removeProposal(kind: keyof Proposals, idx: number) {
    setProposals((p) => { if (!p) return p; const next = { ...p, [kind]: p[kind].filter((_, i) => i !== idx) }; return next })
  }
  const applyProposals = useCallback(async () => {
    if (!proposals || applying) return
    setApplying(true)
    try {
      const r = await fetch('/api/journal/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proposals) })
      if (r.ok) { const d = await r.json(); const c = d.created || {}; setApplied(`Added ${c.tasks || 0} task(s), ${c.events || 0} event(s), ${c.goals || 0} goal(s), ${c.relationships || 0} follow-up(s).`); setProposals(null) }
    } catch {} finally { setApplying(false) }
  }, [proposals, applying])

  const byDay: Array<{ day: string; items: Entry[] }> = []
  for (const e of entries) { const key = e.entryDate?.slice(0, 10) || e.createdAt?.slice(0, 10) || ''; const last = byDay[byDay.length - 1]; if (last && last.day === key) last.items.push(e); else byDay.push({ day: key, items: [e] }) }

  const chip: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '7px 10px', fontSize: 13.5, color: 'var(--color-text-primary)' }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Write / speak box */}
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 18, marginBottom: 20 }}>
        <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown}
          placeholder="What's on your mind? Write or hit the mic and just talk — anything you want to think through, note, or remember…"
          rows={5}
          style={{ width: '100%', border: 'none', outline: 'none', resize: 'vertical', background: 'transparent', color: 'var(--color-text-primary)', fontSize: 15, lineHeight: 1.6, fontFamily: 'var(--font-sans), Inter, system-ui, sans-serif' }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
          <button onClick={recording ? stopMic : startMic} title={recording ? 'Stop' : 'Talk'} aria-label={recording ? 'Stop recording' : 'Start voice input'}
            style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: recording ? '#c0392b' : 'var(--color-bg-primary)', color: recording ? '#fff' : 'var(--color-text-secondary)', animation: recording ? 'pulse 1.3s ease-in-out infinite' : 'none' }}>
            {recording ? '■' : '🎤'}
          </button>
          <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Mood (optional)"
            style={{ flex: '0 0 150px', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: 13 }} />
          {error && <span style={{ color: '#B5502F', fontSize: 13 }}>{error}</span>}
          <button onClick={save} disabled={!text.trim() || saving}
            style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 9, border: 'none', background: text.trim() ? 'var(--color-accent)' : 'var(--color-border)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: text.trim() ? 'pointer' : 'default' }}>
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
          {recording ? '● Listening… speak freely; tap ■ to stop.' : '🎤 speak or type · ⌘/Ctrl+Enter to save · your Coach learns from every entry.'}
        </div>
      </div>

      {/* Extraction status + one-pass review */}
      {extracting && <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Reading your entry…</div>}
      {applied && <div style={{ fontSize: 13, color: '#4F7A52', marginBottom: 16 }}>{applied}</div>}
      {proposals && (
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-accent)', borderRadius: 14, padding: 18, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>From your entry — add these?</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>Memories &amp; goal links were saved automatically. Remove anything you don’t want, then add the rest in one go.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {proposals.goals.map((g, i) => (<div key={'g' + i} style={chip}><span style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 700 }}>GOAL</span><span style={{ flex: 1 }}>{g.name} <span style={{ color: 'var(--color-text-muted)' }}>({g.horizon || 'yearly'}{g.domainId ? ' · ' + g.domainId : ''})</span></span><button onClick={() => removeProposal('goals', i)} style={{ border: 'none', background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button></div>))}
            {proposals.tasks.map((t, i) => (<div key={'t' + i} style={chip}><span style={{ fontSize: 11, color: '#4F7A52', fontWeight: 700 }}>TASK</span><span style={{ flex: 1 }}>{t.name}<span style={{ color: 'var(--color-text-muted)' }}>{fmtWhen(t.scheduledAt)}</span></span><button onClick={() => removeProposal('tasks', i)} style={{ border: 'none', background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button></div>))}
            {proposals.events.map((e, i) => (<div key={'e' + i} style={chip}><span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>EVENT</span><span style={{ flex: 1 }}>{e.title}<span style={{ color: 'var(--color-text-muted)' }}>{fmtWhen(e.startTime)}</span></span><button onClick={() => removeProposal('events', i)} style={{ border: 'none', background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button></div>))}
            {proposals.relationshipFollowups.map((r, i) => (<div key={'r' + i} style={chip}><span style={{ fontSize: 11, color: '#ec4899', fontWeight: 700 }}>REACH OUT</span><span style={{ flex: 1 }}>{r.person}{r.action ? ' — ' + r.action : ''}<span style={{ color: 'var(--color-text-muted)' }}>{fmtWhen(r.when)}</span></span><button onClick={() => removeProposal('relationshipFollowups', i)} style={{ border: 'none', background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button></div>))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={applyProposals} disabled={applying} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{applying ? 'Adding…' : 'Add these'}</button>
            <button onClick={() => setProposals(null)} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Entries */}
      {loading ? (<p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>) : entries.length === 0 ? (<p style={{ color: 'var(--color-text-muted)' }}>No entries yet. Your first thought goes above.</p>) : (
        byDay.map((group) => (
          <div key={group.day} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{fmtDay(group.day)}</div>
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
      <style>{`@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(192,57,43,0.5) } 50% { box-shadow: 0 0 0 6px rgba(192,57,43,0) } }`}</style>
    </div>
  )
}
