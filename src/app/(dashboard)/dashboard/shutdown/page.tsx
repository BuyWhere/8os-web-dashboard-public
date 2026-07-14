/**
 * /dashboard/shutdown — End-of-day "shutdown" ritual
 *
 * The evening counterpart to /dashboard/today: a clean way to close the day.
 *   - DONE today        (OSTask completed today) with a count
 *   - INCOMPLETE today  (scheduled today, still todo/in_progress) with a count
 *   - one-tap "carry incomplete to tomorrow" → reschedules each incomplete task
 *     into tomorrow via the existing scheduler (searchFrom = tomorrow 00:00)
 *   - a brief reflection prompt (rendered; NOT persisted — no JournalEntry model)
 *   - a short archetype-voiced close-the-day line (day-layer tinted, honest)
 *
 * Reuses verified endpoints only:
 *   GET  /api/shutdown      → done/incomplete today + counts + close line
 *   POST /api/schedule      → place an incomplete task into tomorrow
 * No energy UI. No new scheduling logic. Reflection is rendered but NOT persisted.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { QuickAdd } from '@/components/dashboard/QuickAdd'

const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}
const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#6b7280',
}

interface TaskLite {
  id: string
  name: string
  domain: string | null
  priority: string
  status?: string
  scheduledAt?: string | null
  completedAt?: string | null
  duration?: number
}
interface ShutdownData {
  asOf: string
  window: { from: string; to: string }
  doneCount: number
  incompleteCount: number
  done: TaskLite[]
  incomplete: TaskLite[]
  reflection: { persisted: boolean; prompt: string }
  close: { archetypeName: string | null; dayVerdict: string | null; line: string }
}

// Tomorrow at local 00:00, as an ISO string — the searchFrom for "carry forward".
function tomorrowStartISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function ShutdownPage() {
  const [data, setData] = useState<ShutdownData | null>(null)
  const [sidebarGoals, setSidebarGoals] = useState<{ id: string; domainId: string; name: string; progress: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reflection (rendered, NOT persisted — no model exists)
  const [reflection, setReflection] = useState('')

  // Carry-forward action state
  const [carrying, setCarrying] = useState(false)
  const [carryMsg, setCarryMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [sRes, gRes] = await Promise.all([
        fetch('/api/shutdown', { cache: 'no-store' }),
        fetch('/api/goals?status=active', { cache: 'no-store' }),
      ])
      const s = await sRes.json()
      setData(s)
      const g = await gRes.json()
      setSidebarGoals(
        Array.isArray(g)
          ? g.map((x: { id: string; domainId: string; name: string; progress: number }) =>
              ({ id: x.id, domainId: x.domainId, name: x.name, progress: x.progress }))
          : []
      )
    } catch (e) {
      console.error('Failed to load shutdown view:', e)
      setError('Could not load your evening review. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Carry every incomplete-today task into tomorrow, sequentially. Each call
  // reuses POST /api/schedule with searchFrom = tomorrow 00:00 so the existing
  // scheduler finds tomorrow's next conflict-free slot. No new scheduling logic.
  async function carryToTomorrow() {
    if (carrying || !data || data.incomplete.length === 0) return
    setCarrying(true)
    setCarryMsg(null)
    const from = tomorrowStartISO()
    let moved = 0
    let failed = 0
    for (const t of data.incomplete) {
      try {
        const res = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: t.id, searchFrom: from, searchDays: 1 }),
        })
        if (res.ok) moved++
        else failed++
      } catch (e) {
        console.error('carry-forward: failed for task', t.id, e)
        failed++
      }
    }
    await load()
    setCarrying(false)
    if (moved > 0 && failed === 0) setCarryMsg(`Carried ${moved} task${moved === 1 ? '' : 's'} into tomorrow.`)
    else if (moved > 0 && failed > 0) setCarryMsg(`Carried ${moved} forward; ${failed} couldn't find a slot tomorrow.`)
    else setCarryMsg('No free slots tomorrow — try Plan my day in the morning.')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
        <Sidebar goals={[]} />
        <main style={{ flex: 1, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--color-text-muted)' }}>Closing out your day…</div>
        </main>
        <QuickAdd />
      </div>
    )
  }

  const done = data?.done ?? []
  const incomplete = data?.incomplete ?? []
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={sidebarGoals} />

      <main style={{ flex: 1, padding: '24px 24px', overflowY: 'auto', maxWidth: '100%', overflowX: 'hidden' }}>
        <div style={{ marginBottom: 20 }}>
          <Link href="/dashboard/today" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Today</Link>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>Shut down the day</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {dateLabel} · {data?.doneCount ?? 0} done · {data?.incompleteCount ?? 0} still open
          </p>
        </div>

        {error && (
          <div style={{ background: '#FBEFE9', border: '1px solid #E3C4B6', borderRadius: 8, color: '#B5502F', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Archetype-voiced close line */}
        {data?.close?.line && (
          <div style={{
            background: 'linear-gradient(135deg, var(--color-bg-primary) 0%, #FFFFFF 100%)',
            border: '1px solid var(--color-border)', borderRadius: 12, padding: '16px 18px', marginBottom: 20,
          }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.55 }}>{data.close.line}</p>
            {data.close.dayVerdict && (
              <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--color-text-muted)' }}>
                Tinted by today&apos;s daily transit (日) — the lightest BaZi signal, a tint not a rule.
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>

          {/* ─────────────── DONE today ─────────────── */}
          <section style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif), Georgia, serif' }}>
              Done today <span style={{ color: '#4F7A52', fontWeight: 400 }}>({data?.doneCount ?? 0})</span>
            </h2>
            {done.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '8px 0' }}>Nothing checked off yet today.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {done.map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 8, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', opacity: 0.85 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: '#4F7A52', color: '#fff', fontSize: 11, lineHeight: '18px', textAlign: 'center' }}>✓</span>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    {t.completedAt && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{fmtTime(t.completedAt)}</span>}
                    {t.domain && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{DOMAIN_ICONS[t.domain] ?? ''}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ─────────────── INCOMPLETE today ─────────────── */}
          <section style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif), Georgia, serif' }}>
                Still open <span style={{ color: '#f59e0b', fontWeight: 400 }}>({data?.incompleteCount ?? 0})</span>
              </h2>
              {incomplete.length > 0 && (
                <button
                  onClick={carryToTomorrow}
                  disabled={carrying}
                  style={{
                    background: 'var(--color-accent)', border: 'none', borderRadius: 8, color: '#FFFFFF',
                    padding: '8px 13px', fontSize: 12, fontWeight: 600,
                    cursor: carrying ? 'default' : 'pointer', opacity: carrying ? 0.6 : 1, flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  {carrying ? 'Carrying…' : '→ Carry to tomorrow'}
                </button>
              )}
            </div>
            {incomplete.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '8px 0' }}>
                Nothing left open — every task scheduled for today is done. Clean shutdown.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {incomplete.map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 8, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: PRIORITY_COLORS[t.priority] ?? 'var(--color-text-muted)' }} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    {t.scheduledAt && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{fmtTime(t.scheduledAt)}</span>}
                    {t.domain && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{DOMAIN_ICONS[t.domain] ?? ''}</span>}
                  </div>
                ))}
              </div>
            )}
            {carryMsg && <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--color-accent)' }}>{carryMsg}</p>}
          </section>
        </div>

        {/* Reflection prompt (NOT persisted) */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, marginTop: 20 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Reflection</h3>
          <p style={{ margin: '0 0 10px', color: 'var(--color-text-secondary)', fontSize: 13 }}>{data?.reflection.prompt}</p>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Write your reflection…"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 13, padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <p style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: 11 }}>
            Note: reflections are not saved yet — there&apos;s no journal model in the database, so this prompt is for in-session thinking only.
          </p>
        </div>
      </main>

      <QuickAdd />
    </div>
  )
}
