/**
 * /dashboard/vision — Vision Board (OS-2126)
 * A living visual board of the future the user is working toward. Cards show an
 * optional image, title, note, category, and any linked goal. Add/edit/delete
 * via a simple composer (paste an image URL — no upload infra). Grouped by
 * category. Archetype-skinned via --skin-color-accent.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/Sidebar'

interface VisionItem {
  id: string
  title: string
  note: string
  imageUrl: string | null
  goalId: string | null
  category: string | null
  position: number
}

interface Goal {
  id: string
  domainId: string
  name: string
  progress: number
}

const ACCENT = 'var(--skin-color-accent, #6366f1)'

const CATEGORY_SUGGESTIONS = ['career', 'wealth', 'health', 'relationships', 'learning', 'lifestyle', 'legacy']

export default function VisionBoardPage() {
  const [items, setItems] = useState<VisionItem[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // composer
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [category, setCategory] = useState('')
  const [goalId, setGoalId] = useState('')

  // editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNote, setEditNote] = useState('')

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/vision').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/goals').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([visionData, goalsData]) => {
      setItems(Array.isArray(visionData) ? visionData : visionData.items || [])
      setGoals(Array.isArray(goalsData) ? goalsData : goalsData.goals || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const goalName = (id: string | null) => goals.find((g) => g.id === id)?.name

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { title: title.trim() }
      if (note.trim()) body.note = note.trim()
      if (imageUrl.trim()) body.imageUrl = imageUrl.trim()
      if (category.trim()) body.category = category.trim()
      if (goalId) body.goalId = goalId
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        setItems((prev) => [...prev, created])
        setTitle(''); setNote(''); setImageUrl(''); setCategory(''); setGoalId('')
      } else {
        const err = await res.json().catch(() => ({}))
        alert('Could not add item: ' + JSON.stringify(err.error ?? err))
      }
    } catch (err) {
      console.error('add vision item failed', err)
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(item: VisionItem) {
    if (!editTitle.trim()) { setEditingId(null); return }
    try {
      const res = await fetch(`/api/vision/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), note: editNote }),
      })
      if (res.ok) {
        const updated = await res.json()
        setItems((prev) => prev.map((it) => (it.id === item.id ? updated : it)))
      }
    } catch (err) {
      console.error('edit vision item failed', err)
    }
    setEditingId(null)
  }

  async function deleteItem(item: VisionItem) {
    if (!confirm(`Remove "${item.title}" from your vision board?`)) return
    try {
      const res = await fetch(`/api/vision/${item.id}`, { method: 'DELETE' })
      if (res.ok) setItems((prev) => prev.filter((it) => it.id !== item.id))
    } catch (err) {
      console.error('delete vision item failed', err)
    }
  }

  // Group by category (uncategorized last)
  const groups: { key: string; label: string; items: VisionItem[] }[] = []
  const byCat = new Map<string, VisionItem[]>()
  for (const it of items) {
    const key = it.category?.trim() || '__none__'
    if (!byCat.has(key)) byCat.set(key, [])
    byCat.get(key)!.push(it)
  }
  for (const [key, list] of Array.from(byCat.entries())) {
    if (key !== '__none__') groups.push({ key, label: key, items: list })
  }
  groups.sort((a, b) => a.label.localeCompare(b.label))
  if (byCat.has('__none__')) groups.push({ key: '__none__', label: 'Uncategorized', items: byCat.get('__none__')! })

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={goals} />

      <main style={{ flex: 1, padding: '24px 24px', overflowY: 'auto', maxWidth: '100%', overflowX: 'hidden' }}>
        <div style={{ marginBottom: 20 }}>
          <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>Vision Board</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
            A living picture of the future you&apos;re building toward.
            {items.length > 0 && ` ${items.length} item${items.length === 1 ? '' : 's'}.`}
          </p>
        </div>

        {/* Composer */}
        <form
          onSubmit={addItem}
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 16, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What future are you picturing? e.g. Run a marathon next year"
            style={inputStyle}
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why it matters / what it looks like (optional)"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Image URL (paste, optional)"
              style={{ ...inputStyle, flex: '2 1 220px' }}
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (optional)"
              list="vision-categories"
              style={{ ...inputStyle, flex: '1 1 140px' }}
            />
            <datalist id="vision-categories">
              {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              style={{ ...inputStyle, flex: '1 1 160px', cursor: 'pointer' }}
            >
              <option value="">Link a goal (optional)</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              style={{
                background: ACCENT, border: 'none', borderRadius: 8, color: '#fff',
                padding: '8px 18px', fontSize: 13, fontWeight: 600,
                cursor: !title.trim() || saving ? 'not-allowed' : 'pointer',
                opacity: !title.trim() || saving ? 0.5 : 1, flexShrink: 0,
              }}
            >
              {saving ? 'Adding…' : 'Add to board'}
            </button>
          </div>
        </form>

        {loading ? (
          <div style={{ color: 'var(--color-text-secondary)' }}>Loading your vision board…</div>
        ) : items.length === 0 ? (
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>❖</div>
            <div style={{ color: 'var(--color-text-secondary)' }}>Your vision board is empty. Add the futures you&apos;re working toward above, or ask the assistant to add one for you.</div>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} style={{ marginBottom: 28 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {group.label} ({group.items.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                  >
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block', background: 'var(--color-bg-primary)' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                      {editingId === item.id ? (
                        <>
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }}
                          />
                          <textarea
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            rows={2}
                            style={{ ...inputStyle, resize: 'vertical' }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => saveEdit(item)} style={{ ...smallBtn, background: ACCENT, color: '#fff', border: 'none' }}>Save</button>
                            <button onClick={() => setEditingId(null)} style={smallBtn}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.title}</div>
                          {item.note && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{item.note}</div>}
                          <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {item.goalId && goalName(item.goalId) && (
                              <Link href={`/goals/${item.goalId}`} style={{ fontSize: 11, color: ACCENT, textDecoration: 'none', background: 'var(--color-bg-primary)', padding: '2px 8px', borderRadius: 6 }}>
                                ◎ {goalName(item.goalId)}
                              </Link>
                            )}
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => { setEditingId(item.id); setEditTitle(item.title); setEditNote(item.note || '') }}
                                style={smallBtn}
                                title="Edit"
                              >Edit</button>
                              <button onClick={() => deleteItem(item)} style={{ ...smallBtn, color: '#B5502F' }} title="Delete">Delete</button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8,
  color: 'var(--color-text-primary)', padding: '8px 12px', fontSize: 13, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

const smallBtn: React.CSSProperties = {
  background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 6,
  color: 'var(--color-text-secondary)', padding: '4px 10px', fontSize: 12, cursor: 'pointer',
}
