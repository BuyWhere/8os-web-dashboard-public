/**
 * /settings/coach-plays — owner-only curation of the Coach's shared playbook layer.
 * Non-admins get a 403 from the API and see a friendly notice.
 */
'use client'

import { useCallback, useEffect, useState } from 'react'

type Play = { id: string; title: string; topic: string; body: string; enabled: boolean; priority: number }

const card: React.CSSProperties = {
  border: '1px solid var(--color-border)', borderRadius: 12, padding: 16,
  background: 'var(--color-bg-card, #fff)', display: 'flex', flexDirection: 'column', gap: 8,
}
const input: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)',
  background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: 14, width: '100%',
}

export default function CoachPlaysPage() {
  const [plays, setPlays] = useState<Play[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', topic: '', body: '', priority: 5 })

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const r = await fetch('/api/coach/plays')
      if (r.status === 403) { setErr('You are not a Coach admin.'); setPlays([]); return }
      const d = await r.json(); setPlays(d.plays || [])
    } catch { setErr('Failed to load plays.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function add() {
    if (!form.title.trim() || !form.body.trim()) return
    await fetch('/api/coach/plays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ title: '', topic: '', body: '', priority: 5 }); void load()
  }
  async function toggle(p: Play) {
    await fetch('/api/coach/plays', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, enabled: !p.enabled }) })
    void load()
  }
  async function del(id: string) {
    await fetch('/api/coach/plays?id=' + encodeURIComponent(id), { method: 'DELETE' }); void load()
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 80px', color: 'var(--color-text-primary)' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', fontFamily: 'var(--font-serif), Georgia, serif' }}>Coaching plays</h1>
      <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 24px', fontSize: 14 }}>
        Curated best practices shared by every user&apos;s Coach. Add a play here and the Coach applies it when the topic keywords match. Leave the topic blank for an always-on play.
      </p>

      {err && <div style={{ ...card, borderColor: '#B5502F', color: '#B5502F' }}>{err}</div>}

      {!err && (
        <>
          <div style={{ ...card, marginBottom: 24 }}>
            <input style={input} placeholder="Title (e.g. Clarify a vague goal)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input style={input} placeholder="Topic keywords (space/comma separated) — blank = always on" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            <textarea style={{ ...input, minHeight: 90, resize: 'vertical' }} placeholder="The play: what the Coach should do in this situation" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Priority
                <input type="number" style={{ ...input, width: 70, marginLeft: 8, display: 'inline-block' }} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })} />
              </label>
              <button onClick={add} style={{ marginLeft: 'auto', padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Add play</button>
            </div>
          </div>

          {loading ? <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {plays.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No plays yet.</p>}
              {plays.map((p) => (
                <div key={p.id} style={{ ...card, opacity: p.enabled ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <strong style={{ fontSize: 15 }}>{p.title}</strong>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>· priority {p.priority}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.topic ? `· ${p.topic}` : '· always on'}</span>
                    <button onClick={() => toggle(p)} style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>{p.enabled ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => del(p.id)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #B5502F', background: 'transparent', color: '#B5502F', cursor: 'pointer' }}>Delete</button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{p.body}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
