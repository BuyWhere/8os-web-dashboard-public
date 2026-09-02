/**
 * /dashboard/memory — "What 8os knows about you" (E-5, backlog §3.2).
 *
 * The trust / correction / GDPR surface: the durable memory_items 8os has
 * distilled about the user, grouped by kind, each editable, pinnable, and
 * hard-deletable. Users can also add a memory manually. Everything goes through
 * /api/memory (requireAuth, userId-scoped). Same client-page pattern as
 * /dashboard/inbox.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/Sidebar'

type Kind = 'fact' | 'preference' | 'person' | 'insight' | 'event'
interface MemoryItem {
  id: string
  kind: Kind
  content: string
  salience: number
  pinned: boolean
  sourceKind: string | null
  createdAt: string
  lastConfirmedAt: string
}

const KIND_LABEL: Record<Kind, string> = {
  fact: 'Facts', preference: 'Preferences', person: 'People', insight: 'Insights', event: 'Events',
}
const KIND_ORDER: Kind[] = ['fact', 'preference', 'person', 'insight', 'event']
const KIND_COLOR: Record<Kind, string> = {
  fact: '#6366f1', preference: '#0ea5e9', person: '#22c55e', insight: '#eab308', event: '#f97316',
}

export default function MemoryPage() {
  const [items, setItems] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [newKind, setNewKind] = useState<Kind>('fact')
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/memory', { cache: 'no-store' })
      if (!res.ok) throw new Error(`memory ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      console.error('Failed to load memory:', e)
      setError('Could not load your memory. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function patch(id: string, payload: Record<string, unknown>) {
    setBusy((b) => ({ ...b, [id]: true }))
    try {
      const res = await fetch('/api/memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      if (res.ok) {
        const updated = await res.json()
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...updated } : x)))
      }
    } catch { /* best-effort */ } finally {
      setBusy((b) => ({ ...b, [id]: false }))
    }
  }

  async function del(id: string) {
    if (!confirm('Delete this memory? 8os will forget it and exclude it from future recall.')) return
    setBusy((b) => ({ ...b, [id]: true }))
    try {
      const res = await fetch(`/api/memory?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id))
    } catch { /* best-effort */ } finally {
      setBusy((b) => ({ ...b, [id]: false }))
    }
  }

  async function add() {
    const content = newContent.trim()
    if (content.length < 2) return
    setAdding(true)
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: newKind, content }),
      })
      if (res.ok) {
        setNewContent('')
        await load()
      }
    } catch { /* best-effort */ } finally {
      setAdding(false)
    }
  }

  const byKind = KIND_ORDER.map((k) => ({
    kind: k,
    rows: items.filter((i) => String(i.kind ?? '').toLowerCase() === k),
  })).filter((g) => g.rows.length > 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
        <Sidebar goals={[]} />
        <main style={{ flex: 1, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--color-text-secondary)' }}>Recalling what 8os knows…</div>
        </main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={[]} />
      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 20, maxWidth: 760 }}>
          <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>What 8os knows about you</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Durable facts 8os has learned, distilled from your journal and conversations, plus anything you add.
            Edit, pin the important ones, or delete anything wrong. Deleting removes it and stops 8os re-learning it.
          </p>
        </div>

        {/* Add a memory manually */}
        <div style={{ maxWidth: 760, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as Kind)}
              style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 13, padding: '8px 10px' }}
            >
              {KIND_ORDER.map((k) => <option key={k} value={k}>{KIND_LABEL[k].replace(/s$/, '')}</option>)}
            </select>
            <input
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add() }}
              placeholder="Add something 8os should remember…"
              style={{ flex: 1, minWidth: 220, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 13, padding: '8px 10px' }}
            />
            <button
              onClick={add}
              disabled={adding || newContent.trim().length < 2}
              className="memory-add-btn"
              style={{
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                padding: '8px 16px',
                cursor: adding || newContent.trim().length < 2 ? 'not-allowed' : 'pointer',
                opacity: adding || newContent.trim().length < 2 ? 0.72 : 1,
              }}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ maxWidth: 760, background: '#FBEDE8', border: '1px solid #E8C4B6', borderRadius: 8, color: '#B5502F', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!error && items.length === 0 && (
          <div style={{ maxWidth: 760, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 28, color: 'var(--color-text-secondary)', fontSize: 14 }}>
            8os hasn&apos;t learned anything durable yet. As you journal and chat, it will distill stable facts here each night, or add one above.
          </div>
        )}

        <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {byKind.map(({ kind, rows }) => (
            <section key={kind}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: KIND_COLOR[kind] }} />
                <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{KIND_LABEL[kind]}</h2>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{rows.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.map((m) => {
                  const isEditing = editing[m.id] !== undefined
                  const body = (m.content ?? '').trim()
                  const displayBody = body || (kind === 'person' ? 'Unnamed person' : 'Untitled memory')
                  return (
                    <div
                      key={m.id || `${kind}-${m.createdAt}`}
                      data-testid="memory-item"
                      data-kind={kind}
                      style={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderLeft: `2px solid ${m.pinned ? KIND_COLOR[kind] : 'var(--color-border)'}`,
                        borderRadius: 10,
                        padding: '12px 14px',
                        minHeight: 56,
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <input
                            value={editing[m.id]}
                            onChange={(e) => setEditing((s) => ({ ...s, [m.id]: e.target.value }))}
                            style={{ flex: 1, minWidth: 200, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 13, padding: '6px 10px' }}
                          />
                          <button
                            onClick={async () => { await patch(m.id, { content: editing[m.id] }); setEditing((s) => { const c = { ...s }; delete c[m.id]; return c }) }}
                            disabled={busy[m.id]}
                            style={{ background: '#EDF3ED', border: '1px solid #4F7A5244', borderRadius: 8, color: '#4F7A52', fontSize: 12, fontWeight: 700, padding: '6px 12px', cursor: 'pointer' }}
                          >Save</button>
                          <button
                            onClick={() => setEditing((s) => { const c = { ...s }; delete c[m.id]; return c })}
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-secondary)', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}
                          >Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                            <div style={{ wordBreak: 'break-word' }}>
                              {m.pinned && <span title="Pinned" style={{ marginRight: 6 }}>📌</span>}
                              <span style={!body ? { fontStyle: 'italic', color: 'var(--color-text-secondary)' } : undefined}>
                                {displayBody}
                              </span>
                            </div>
                            <div
                              data-testid="memory-meta"
                              className="memory-meta"
                              style={{
                                marginTop: 6,
                                fontSize: 11,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              salience {Number.isFinite(m.salience) ? m.salience : '—'}
                              {m.sourceKind ? ` · ${m.sourceKind}` : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button title={m.pinned ? 'Unpin' : 'Pin'} onClick={() => patch(m.id, { pinned: !m.pinned })} disabled={busy[m.id]} style={btn}>{m.pinned ? 'Unpin' : 'Pin'}</button>
                            <button title="Edit" onClick={() => setEditing((s) => ({ ...s, [m.id]: m.content ?? '' }))} style={btn}>Edit</button>
                            <button title="Delete" onClick={() => del(m.id)} disabled={busy[m.id]} data-testid="memory-delete" style={{ ...btn, color: '#B5502F', borderColor: '#E8C4B6' }}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

const btn: React.CSSProperties = {
  background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-secondary)',
  fontSize: 12, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
}
