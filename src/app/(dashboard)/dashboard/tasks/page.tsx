/**
 * /dashboard/tasks — Tasks list page
 * Features: inline complete/edit, responsive grid, filter controls.
 */
'use client'

import { useState, useEffect } from 'react'
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

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Progress', done: 'Done', cancelled: 'Cancelled',
}

type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done'
type FilterPriority = 'all' | 'high' | 'medium' | 'low'
type FilterDomain = 'all' | string

export default function TasksPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [filterDomain, setFilterDomain] = useState<FilterDomain>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [completing, setCompleting] = useState<string | null>(null)

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

  async function toggleComplete(task: Task) {
    if (completing) return
    setCompleting(task.id)
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done'
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
      }
    } catch (e) {
      console.error('Failed to toggle task:', e)
    } finally {
      setCompleting(null)
    }
  }

  async function startEdit(task: Task) {
    setEditingId(task.id)
    setEditValue(task.name)
  }

  async function saveEdit(task: Task) {
    if (!editValue.trim()) {
      setEditingId(null)
      return
    }
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValue.trim() }),
      })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: editValue.trim() } : t))
      }
    } catch (e) {
      console.error('Failed to edit task:', e)
    }
    setEditingId(null)
  }

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterDomain !== 'all' && t.domainId !== filterDomain) return false
    return true
  })

  // Group filtered tasks
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayTasks = filteredTasks.filter(t => t.scheduledAt && new Date(t.scheduledAt) >= today && new Date(t.scheduledAt) < tomorrow)
  const upcomingTasks = filteredTasks.filter(t => t.scheduledAt && new Date(t.scheduledAt) >= tomorrow && t.status === 'todo')
  const unscheduledTasks = filteredTasks.filter(t => !t.scheduledAt && t.status === 'todo')
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress')
  const doneTasks = filteredTasks.filter(t => t.status === 'done').slice(0, 10)

  const uniqueDomains = Array.from(new Set(tasks.map(t => t.domainId).filter(Boolean))) as string[]

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

      <main style={{ flex: 1, padding: '24px 24px', overflowY: 'auto', maxWidth: '100%', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>Tasks</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              {filteredTasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length} active
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as FilterStatus)}
              style={{
                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 6,
                color: 'var(--color-text-primary)', padding: '6px 10px', fontSize: 12, cursor: 'pointer',
              }}
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>

            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as FilterPriority)}
              style={{
                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 6,
                color: 'var(--color-text-primary)', padding: '6px 10px', fontSize: 12, cursor: 'pointer',
              }}
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
                style={{
                  background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 6,
                  color: 'var(--color-text-primary)', padding: '6px 10px', fontSize: 12, cursor: 'pointer',
                }}
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
          /* Responsive: 2 cols on wide, 1 col on mobile */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
            gap: 20,
          }}>
            <div>
              {renderTaskGroup('In Progress', inProgressTasks, 'No tasks in progress', toggleComplete, startEdit, saveEdit, editingId, editValue, setEditValue, completing, setEditingId)}
              {renderTaskGroup('Today', todayTasks, 'Nothing scheduled for today', toggleComplete, startEdit, saveEdit, editingId, editValue, setEditValue, completing, setEditingId)}
              {renderTaskGroup('Upcoming', upcomingTasks, 'No upcoming tasks', toggleComplete, startEdit, saveEdit, editingId, editValue, setEditValue, completing, setEditingId)}
            </div>
            <div>
              {renderTaskGroup('Unscheduled', unscheduledTasks, 'All tasks are scheduled', toggleComplete, startEdit, saveEdit, editingId, editValue, setEditValue, completing, setEditingId)}
              {renderTaskGroup('Recently Done', doneTasks, 'No completed tasks yet', toggleComplete, startEdit, saveEdit, editingId, editValue, setEditValue, completing, setEditingId)}
            </div>
          </div>
        )}
      </main>

      <QuickAdd />
    </div>
  )
}

function renderTaskGroup(
  title: string,
  taskList: Task[],
  emptyMessage: string,
  toggleComplete: (t: Task) => void,
  startEdit: (t: Task) => void,
  saveEdit: (t: Task) => void,
  editingId: string | null,
  editValue: string,
  setEditValue: (v: string) => void,
  completing: string | null,
  setEditingId: (id: string | null) => void,
) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title} ({taskList.length})
      </h3>
      {taskList.length === 0 ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '12px 0' }}>{emptyMessage}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {taskList.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 10, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
              opacity: t.status === 'done' ? 0.6 : 1,
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleComplete(t)}
                disabled={completing === t.id}
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                  background: t.status === 'done' ? '#4F7A52' : 'transparent',
                  border: t.status === 'done' ? 'none' : `2px solid ${PRIORITY_COLORS[t.priority] ?? 'var(--color-text-muted)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {t.status === 'done' && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
              </button>

              {/* Priority dot */}
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: t.status === 'done' ? '#4F7A52' : (PRIORITY_COLORS[t.priority] ?? 'var(--color-text-muted)'),
              }} />

              {/* Task info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === t.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(t)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(t)
                      if (e.key === 'Escape') { setEditingId(null) }
                    }}
                    style={{
                      width: '100%', background: 'var(--color-bg-primary)', border: '1px solid var(--color-accent)',
                      borderRadius: 4, padding: '2px 6px', color: 'var(--color-text-primary)', fontSize: 13,
                      outline: 'none',
                    }}
                  />
                ) : (
                  <div
                    onDoubleClick={() => startEdit(t)}
                    style={{
                      fontSize: 13, color: t.status === 'done' ? 'var(--color-text-muted)' : '#221F1A',
                      textDecoration: t.status === 'done' ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      cursor: 'text',
                    }}
                    title="Double-click to edit"
                  >
                    {t.name}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 11, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                  {t.scheduledAt && (
                    <span>{new Date(t.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} {new Date(t.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  )}
                  <span>{t.duration}m</span>
                  {t.project && <span style={{ color: 'var(--color-accent)' }}>{t.project.name}</span>}
                </div>
              </div>

              {/* Domain indicator */}
              {t.domainId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: DOMAIN_COLORS[t.domainId] ?? 'var(--color-text-muted)' }} />
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{DOMAIN_ICONS[t.domainId]}</span>
                </div>
              )}

              {/* Status badge */}
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                background: t.status === 'done' ? '#4F7A5222' : t.status === 'in_progress' ? 'var(--color-accent)22' : 'var(--color-bg-primary)',
                color: t.status === 'done' ? '#4F7A52' : t.status === 'in_progress' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                flexShrink: 0,
              }}>
                {STATUS_LABELS[t.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
