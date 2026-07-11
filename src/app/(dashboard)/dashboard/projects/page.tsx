/**
 * /dashboard/projects — Projects list page
 * Features: inline edit, drag-to-reorder, task inline complete.
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { QuickAdd } from '@/components/dashboard/QuickAdd'

interface Task {
  id: string
  name: string
  status: string
  priority: string
}

interface Project {
  id: string
  name: string
  description: string
  estimatedDuration: string
  suggestedOrder: number
  goalId: string
  goal: { id: string; name: string; domainId: string } | null
  tasks: Task[]
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

export default function ProjectsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [completingTask, setCompletingTask] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/goals').then(r => r.json()).catch(() => []),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
    ]).then(([goalsData, projectsData]) => {
      setGoals(goalsData.goals || goalsData || [])
      setProjects(projectsData.projects || projectsData || [])
      setLoading(false)
    })
  }, [])

  // Group projects by goal
  const groupedByGoal = new Map<string, { goalName: string; domainId: string; projects: Project[] }>()
  for (const p of projects) {
    const goalKey = p.goalId ?? '__ungrouped__'
    if (!groupedByGoal.has(goalKey)) {
      groupedByGoal.set(goalKey, {
        goalName: p.goal?.name ?? 'Ungrouped',
        domainId: p.goal?.domainId ?? 'career',
        projects: [],
      })
    }
    groupedByGoal.get(goalKey)!.projects.push(p)
  }

  async function startEdit(project: Project) {
    setEditingId(project.id)
    setEditValue(project.name)
  }

  async function saveEdit(project: Project) {
    if (!editValue.trim()) { setEditingId(null); return }
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValue.trim() }),
      })
      if (res.ok) {
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, name: editValue.trim() } : p))
      }
    } catch (e) {
      console.error('Failed to edit project:', e)
    }
    setEditingId(null)
  }

  async function toggleTaskComplete(task: Task) {
    if (completingTask) return
    setCompletingTask(task.id)
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done'
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setProjects(prev => prev.map(p => ({
          ...p,
          tasks: p.tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t),
        })))
      }
    } catch (e) {
      console.error('Failed to toggle task:', e)
    } finally {
      setCompletingTask(null)
    }
  }

  async function reorderProject(projectId: string, newOrder: number) {
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestedOrder: newOrder }),
      })
      setProjects(prev => {
        const updated = prev.map(p => p.id === projectId ? { ...p, suggestedOrder: newOrder } : p)
        return updated.sort((a, b) => (a.suggestedOrder ?? 0) - (b.suggestedOrder ?? 0))
      })
    } catch (e) {
      console.error('Failed to reorder:', e)
    }
  }

  function handleDragStart(e: React.DragEvent, projectId: string) {
    setDragId(projectId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, projectId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const target = projects.find(p => p.id === projectId)
    const source = projects.find(p => p.id === dragId)
    if (target && source && target.goalId === source.goalId && target.id !== dragId) {
      reorderProject(projectId, target.suggestedOrder)
    }
  }

  function handleDragEnd() {
    setDragId(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: '#F7F3EC', color: '#221F1A' }}>
        <Sidebar goals={[]} />
        <main style={{ flex: 1, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#666' }}>Loading projects...</div>
        </main>
        <QuickAdd />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: '#F7F3EC', color: '#221F1A' }}>
      <Sidebar goals={goals} />

      <main style={{ flex: 1, padding: '24px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <Link href="/dashboard" style={{ color: '#555', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Projects</h1>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>
              {projects.length} projects across {groupedByGoal.size} goals
            </p>
          </div>
        </div>

        {projects.length === 0 ? (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <div style={{ color: '#888', marginBottom: 16 }}>No projects yet. Complete onboarding to generate your first projects.</div>
            <Link href="/onboarding" style={{ color: '#6366f1', fontSize: 14 }}>Start onboarding →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {Array.from(groupedByGoal.entries()).map(([goalId, group]) => {
              const domainColor = DOMAIN_COLORS[group.domainId] ?? '#6366f1'
              const totalTasks = group.projects.reduce((acc, p) => acc + p.tasks.length, 0)
              const doneTasks = group.projects.reduce((acc, p) => acc + p.tasks.filter(t => t.status === 'done').length, 0)

              return (
                <div key={goalId}>
                  {/* Goal Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 16 }}>{DOMAIN_ICONS[group.domainId]}</span>
                    <Link href={`/goals/${goalId}`} style={{ fontWeight: 600, fontSize: 15, color: '#ededed', textDecoration: 'none' }}>
                      {group.goalName}
                    </Link>
                    <span style={{ fontSize: 11, color: '#555' }}>
                      {group.projects.length} projects · {doneTasks}/{totalTasks} tasks
                    </span>
                  </div>

                  {/* Projects Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {group.projects.sort((a, b) => (a.suggestedOrder ?? 0) - (b.suggestedOrder ?? 0)).map(p => {
                      const total = p.tasks.length
                      const done = p.tasks.filter(t => t.status === 'done').length
                      const progress = total > 0 ? done / total : 0

                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, p.id)}
                          onDragOver={(e) => handleDragOver(e, p.id)}
                          onDragEnd={handleDragEnd}
                          style={{
                            background: dragId === p.id ? '#1a1a2a' : '#111',
                            border: `1px solid ${dragId === p.id ? '#6366f144' : '#1e1e1e'}`,
                            borderRadius: 12, padding: 16,
                            transition: 'all 0.15s', cursor: 'grab',
                            opacity: dragId === p.id ? 0.7 : 1,
                          }}
                        >
                          {/* Drag handle + Name */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                            <ProgressRing progress={progress} size={44} color={domainColor} label={total > 0 ? `${done}/${total}` : '—'} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {editingId === p.id ? (
                                <input
                                  autoFocus
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={() => saveEdit(p)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveEdit(p)
                                    if (e.key === 'Escape') setEditingId(null)
                                  }}
                                  style={{
                                    width: '100%', background: '#1a1a1a', border: '1px solid #6366f1',
                                    borderRadius: 4, padding: '2px 6px', color: '#ededed', fontSize: 13,
                                    outline: 'none', boxSizing: 'border-box',
                                  }}
                                />
                              ) : (
                                <div
                                  onDoubleClick={() => startEdit(p)}
                                  style={{
                                    fontWeight: 600, fontSize: 13, color: '#ededed',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    cursor: 'text',
                                  }}
                                  title="Double-click to edit"
                                >
                                  {p.name}
                                </div>
                              )}
                              {p.description && (
                                <div style={{ fontSize: 11, color: '#666', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.description.slice(0, 60)}{p.description.length > 60 ? '…' : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Tasks inline */}
                          {p.tasks.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, marginLeft: 56 }}>
                              {p.tasks.slice(0, 4).map(t => (
                                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    onClick={() => toggleTaskComplete(t)}
                                    disabled={completingTask === t.id}
                                    style={{
                                      width: 14, height: 14, borderRadius: 3, flexShrink: 0, cursor: 'pointer',
                                      background: t.status === 'done' ? '#22c55e' : 'transparent',
                                      border: t.status === 'done' ? 'none' : '1px solid #555',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      transition: 'all 0.15s',
                                    }}
                                  >
                                    {t.status === 'done' && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                                  </button>
                                  <span style={{
                                    fontSize: 11,
                                    color: t.status === 'done' ? '#555' : '#ccc',
                                    textDecoration: t.status === 'done' ? 'line-through' : 'none',
                                  }}>
                                    {t.name}
                                  </span>
                                </div>
                              ))}
                              {p.tasks.length > 4 && (
                                <div style={{ fontSize: 10, color: '#555' }}>+{p.tasks.length - 4} more</div>
                              )}
                            </div>
                          )}

                          {/* Footer */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 11, color: '#555' }}>
                              {p.estimatedDuration}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, color: '#555', cursor: 'grab' }}>⋮⋮</span>
                              <div style={{ height: 3, width: 60, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progress * 100}%`, background: domainColor, borderRadius: 2 }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <QuickAdd />
    </div>
  )
}
