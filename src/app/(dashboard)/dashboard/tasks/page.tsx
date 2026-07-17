/**
 * /dashboard/tasks — Tasks list page
 *
 * Groups: In Progress / OVERDUE (undone tasks from past days — never hidden or
 * deleted; they roll forward until done or deferred) / Today / Upcoming /
 * Unscheduled / Recently Done. Checking a task off moves it OUT of its due
 * group and into Recently Done.
 *
 * Per-tile actions: checkbox complete, Defer ▾ (tomorrow / next week / pick a
 * date — no need to open the task), click the tile to expand an inline editor
 * (date, time, duration, priority). Double-click the name to rename.
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { QuickAdd } from '@/components/dashboard/QuickAdd'

interface Task {
  id: string
  name: string
  status: string
  priority: string
  duration: number
  scheduledAt: string | null
  domainId: string | null
  project: { id: string; name: string } | null
}

interface Goal {
  id: string
  domainId: string
  name: string
  progress: number
}

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

type FilterPriority = 'all' | 'high' | 'medium' | 'low'
type FilterDomain = 'all' | string

/** ISO for the same wall-clock time-of-day as `src` on the local date `target`. */
function withTimeOfDay(target: Date, src: string | null): string {
  const d = new Date(target)
  if (src) {
    const s = new Date(src)
    d.setHours(s.getHours(), s.getMinutes(), 0, 0)
  } else {
    d.setHours(9, 0, 0, 0)
  }
  return d.toISOString()
}

function localDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function localTimeInput(iso: string | null): string {
  if (!iso) return '09:00'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function TasksPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [filterDomain, setFilterDomain] = useState<FilterDomain>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [completing, setCompleting] = useState<string | null>(null)
  const [deferOpenId, setDeferOpenId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  // Local completion order so freshly-checked tasks appear on top of Recently Done.
  const completedOrder = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    Promise.all([
      fetch('/api/goals').then(r => r.json()).catch(() => []),
      fetch('/api/tasks').then(r => r.json()).catch(() => []),
    ]).then(([goalsData, tasksData]) => {
      setGoals(goalsData.goals || goalsData || [])
      setTasks(tasksData.tasks || tasksData || [])
      setLoading(false)
    })
  }, [])

  async function patchTask(id: string, patch: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      return res.ok
    } catch { return false }
  }

  async function toggleComplete(task: Task) {
    if (completing) return
    setCompleting(task.id)
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    if (newStatus === 'done') completedOrder.current.set(task.id, Date.now())
    if (await patchTask(task.id, { status: newStatus })) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    }
    setCompleting(null)
  }

  async function deferTask(task: Task, kind: 'tomorrow' | 'nextweek' | string) {
    let target: Date
    const now = new Date()
    if (kind === 'tomorrow') {
      target = new Date(now); target.setDate(target.getDate() + 1)
    } else if (kind === 'nextweek') {
      // Next Monday.
      target = new Date(now)
      target.setDate(target.getDate() + ((8 - target.getDay()) % 7 || 7))
    } else {
      const [y, m, d] = kind.split('-').map(Number)
      if (!y || !m || !d) return
      target = new Date(y, m - 1, d)
    }
    const iso = withTimeOfDay(target, task.scheduledAt)
    if (await patchTask(task.id, { scheduledAt: iso })) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, scheduledAt: iso } : t))
    }
    setDeferOpenId(null)
  }

  async function saveDetail(task: Task, form: { date: string; time: string; duration: number; priority: string }) {
    const patch: Record<string, unknown> = { duration: form.duration, priority: form.priority }
    if (form.date) {
      const [y, m, d] = form.date.split('-').map(Number)
      const [hh, mm] = (form.time || '09:00').split(':').map(Number)
      patch.scheduledAt = new Date(y, m - 1, d, hh, mm).toISOString()
    } else {
      patch.scheduledAt = null
    }
    if (await patchTask(task.id, patch)) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, scheduledAt: (patch.scheduledAt as string | null), duration: form.duration, priority: form.priority } : t))
    }
    setDetailId(null)
  }

  async function startEdit(task: Task) { setEditingId(task.id); setEditValue(task.name) }
  async function saveEdit(task: Task) {
    if (!editValue.trim()) { setEditingId(null); return }
    if (await patchTask(task.id, { name: editValue.trim() })) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: editValue.trim() } : t))
    }
    setEditingId(null)
  }

  // Filters (status filter removed — the grouping IS the status view).
  const filteredTasks = tasks.filter(t => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterDomain !== 'all' && t.domainId !== filterDomain) return false
    return true
  })

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const isOpen = (t: Task) => t.status === 'todo'
  // OVERDUE: undone tasks scheduled before today. They are never hidden — they
  // roll forward here until completed or deferred.
  const overdueTasks = filteredTasks.filter(t => isOpen(t) && t.scheduledAt && new Date(t.scheduledAt) < todayStart)
  const todayTasks = filteredTasks.filter(t => isOpen(t) && t.scheduledAt && new Date(t.scheduledAt) >= todayStart && new Date(t.scheduledAt) < tomorrowStart)
  const upcomingTasks = filteredTasks.filter(t => isOpen(t) && t.scheduledAt && new Date(t.scheduledAt) >= tomorrowStart)
  const unscheduledTasks = filteredTasks.filter(t => isOpen(t) && !t.scheduledAt)
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress')
  const doneTasks = filteredTasks
    .filter(t => t.status === 'done')
    .sort((a, b) => (completedOrder.current.get(b.id) ?? 0) - (completedOrder.current.get(a.id) ?? 0))
    .slice(0, 15)

  const uniqueDomains = Array.from(new Set(tasks.map(t => t.domainId).filter(Boolean))) as string[]

  const group = (title: string, list: Task[], empty: string, opts?: { overdue?: boolean }) => (
    <TaskGroup
      key={title}
      title={title} taskList={list} emptyMessage={empty} overdue={opts?.overdue}
      toggleComplete={toggleComplete} startEdit={startEdit} saveEdit={saveEdit}
      editingId={editingId} editValue={editValue} setEditValue={setEditValue}
      completing={completing} setEditingId={setEditingId}
      deferOpenId={deferOpenId} setDeferOpenId={setDeferOpenId} deferTask={deferTask}
      detailId={detailId} setDetailId={setDetailId} saveDetail={saveDetail}
    />
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
        <Sidebar goals={[]} />
        <main style={{ flex: 1, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--color-text-secondary)' }}>Loading tasks...</div>
        </main>
        <QuickAdd />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={goals} />

      <main style={{ flex: 1, padding: '24px 24px', overflowY: 'auto', maxWidth: '100%', overflowX: 'hidden' }} onClick={() => setDeferOpenId(null)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>Tasks</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              {filteredTasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length} active
              {overdueTasks.length > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}> · {overdueTasks.length} overdue</span>}
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as FilterPriority)}
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {uniqueDomains.length > 0 && (
              <select
                value={filterDomain}
                onChange={e => setFilterDomain(e.target.value)}
                style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
              >
                <option value="all">All Domains</option>
                {uniqueDomains.map(d => (
                  <option key={d} value={d}>{DOMAIN_ICONS[d]} {d}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {tasks.length === 0 ? (
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>No tasks yet. Press ⌘K to add your first task.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 20 }}>
            <div>
              {overdueTasks.length > 0 && group('Overdue', overdueTasks, '', { overdue: true })}
              {group('In Progress', inProgressTasks, 'No tasks in progress')}
              {group('Today', todayTasks, 'Nothing scheduled for today')}
              {group('Upcoming', upcomingTasks, 'No upcoming tasks')}
            </div>
            <div>
              {group('Unscheduled', unscheduledTasks, 'All tasks are scheduled')}
              {group('Recently Done', doneTasks, 'No completed tasks yet')}
            </div>
          </div>
        )}
      </main>

      <QuickAdd />
    </div>
  )
}

function TaskGroup(props: {
  title: string
  taskList: Task[]
  emptyMessage: string
  overdue?: boolean
  toggleComplete: (t: Task) => void
  startEdit: (t: Task) => void
  saveEdit: (t: Task) => void
  editingId: string | null
  editValue: string
  setEditValue: (v: string) => void
  completing: string | null
  setEditingId: (id: string | null) => void
  deferOpenId: string | null
  setDeferOpenId: (id: string | null) => void
  deferTask: (t: Task, kind: string) => void
  detailId: string | null
  setDetailId: (id: string | null) => void
  saveDetail: (t: Task, form: { date: string; time: string; duration: number; priority: string }) => void
}) {
  const { title, taskList, emptyMessage, overdue } = props
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: overdue ? '#ef4444' : 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title} ({taskList.length})
      </h3>
      {taskList.length === 0 ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '12px 0' }}>{emptyMessage}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {taskList.map(t => <TaskTile key={t.id} t={t} overdue={overdue} {...props} />)}
        </div>
      )}
    </div>
  )
}

function TaskTile(props: {
  t: Task
  overdue?: boolean
  toggleComplete: (t: Task) => void
  startEdit: (t: Task) => void
  saveEdit: (t: Task) => void
  editingId: string | null
  editValue: string
  setEditValue: (v: string) => void
  completing: string | null
  setEditingId: (id: string | null) => void
  deferOpenId: string | null
  setDeferOpenId: (id: string | null) => void
  deferTask: (t: Task, kind: string) => void
  detailId: string | null
  setDetailId: (id: string | null) => void
  saveDetail: (t: Task, form: { date: string; time: string; duration: number; priority: string }) => void
}) {
  const { t, overdue, toggleComplete, startEdit, saveEdit, editingId, editValue, setEditValue, completing, setEditingId, deferOpenId, setDeferOpenId, deferTask, detailId, setDetailId, saveDetail } = props
  const [pickDate, setPickDate] = useState(false)
  const [form, setForm] = useState({ date: localDateInput(t.scheduledAt), time: localTimeInput(t.scheduledAt), duration: t.duration, priority: t.priority })
  const open = detailId === t.id
  const deferOpen = deferOpenId === t.id
  const done = t.status === 'done'

  return (
    <div style={{ borderRadius: 10, background: 'var(--color-bg-card)', border: `1px solid ${overdue ? '#ef444455' : 'var(--color-border)'}`, opacity: done ? 0.6 : 1, transition: 'border-color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = overdue ? '#ef444455' : 'var(--color-border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', position: 'relative' }}
        onClick={(e) => { e.stopPropagation(); setDeferOpenId(null); setForm({ date: localDateInput(t.scheduledAt), time: localTimeInput(t.scheduledAt), duration: t.duration, priority: t.priority }); setDetailId(open ? null : t.id) }}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleComplete(t) }}
          disabled={completing === t.id}
          aria-label={done ? 'Mark not done' : 'Mark done'}
          style={{
            width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
            background: done ? '#4F7A52' : 'transparent',
            border: done ? 'none' : `2px solid ${PRIORITY_COLORS[t.priority] ?? 'var(--color-text-muted)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {done && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
        </button>

        {/* Task info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingId === t.id ? (
            <input
              autoFocus
              value={editValue}
              onClick={(e) => e.stopPropagation()}
              onChange={e => setEditValue(e.target.value)}
              onBlur={() => saveEdit(t)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(t); if (e.key === 'Escape') setEditingId(null) }}
              style={{ width: '100%', background: 'var(--color-bg-primary)', border: '1px solid var(--color-accent)', borderRadius: 4, padding: '2px 6px', color: 'var(--color-text-primary)', fontSize: 13, outline: 'none' }}
            />
          ) : (
            <div
              onDoubleClick={(e) => { e.stopPropagation(); startEdit(t) }}
              style={{ fontSize: 13, color: done ? 'var(--color-text-muted)' : 'var(--color-text-primary)', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title="Click for details · double-click to rename"
            >
              {t.name}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 11, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
            {t.scheduledAt && (
              <span style={{ color: overdue ? '#ef4444' : undefined, fontWeight: overdue ? 600 : undefined }}>
                {overdue ? 'was due ' : ''}{new Date(t.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} {new Date(t.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            <span>{t.duration}m</span>
            {t.project && <span style={{ color: 'var(--color-accent)' }}>{t.project.name}</span>}
            {t.domainId && <span>{DOMAIN_ICONS[t.domainId]} <span style={{ color: DOMAIN_COLORS[t.domainId] }}>{t.domainId}</span></span>}
          </div>
        </div>

        {/* Defer (not for done tasks) */}
        {!done && (
          <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setPickDate(false); setDeferOpenId(deferOpen ? null : t.id) }}
              style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
            >
              Defer ▾
            </button>
            {deferOpen && (
              <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 30, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.25)', minWidth: 150, overflow: 'hidden' }}>
                {!pickDate ? (
                  <>
                    <DeferOption label="Tomorrow" onClick={() => deferTask(t, 'tomorrow')} />
                    <DeferOption label="Next week" onClick={() => deferTask(t, 'nextweek')} />
                    <DeferOption label="Pick a date…" onClick={() => setPickDate(true)} />
                  </>
                ) : (
                  <div style={{ padding: 10 }}>
                    <input
                      type="date" autoFocus
                      min={localDateInput(new Date().toISOString())}
                      onChange={(e) => { if (e.target.value) deferTask(t, e.target.value) }}
                      style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', padding: '6px 8px', fontSize: 12 }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline detail editor */}
      {open && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <DetailField label="Date">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={detailInput} />
          </DetailField>
          <DetailField label="Time">
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} style={detailInput} />
          </DetailField>
          <DetailField label="Duration (min)">
            <input type="number" min={5} max={480} step={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) || 30 })} style={{ ...detailInput, width: 70 }} />
          </DetailField>
          <DetailField label="Priority">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={detailInput}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </DetailField>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {form.date && (
              <button onClick={() => setForm({ ...form, date: '', time: '09:00' })} style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                Unschedule
              </button>
            )}
            <button onClick={() => setDetailId(null)} style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={() => saveDetail(t, form)} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--color-accent)', color: '#fff', cursor: 'pointer' }}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const detailInput: React.CSSProperties = {
  background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 6,
  color: 'var(--color-text-primary)', padding: '6px 8px', fontSize: 12,
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {label}
      {children}
    </label>
  )
}

function DeferOption({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 12.5, background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-primary)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </button>
  )
}
