/**
 * /goals/[id] — Goal Detail View (Task 7)
 * Header, projects list, tasks list with filter/sort, calendar timeline, activity log.
 */
import { getServerAppUserId } from '@/lib/auth/server-user'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { QuickAdd } from '@/components/dashboard/QuickAdd'
import Link from 'next/link'

// We re-use the same auth helper pattern
async function getUserId(): Promise<string> {
  // Clerk is the source of truth (2026-07-10). Resolves the Clerk session
  // to an app User.id (lazy-provisioning if needed) or redirects to /login.
  return await getServerAppUserId('/goals')
}

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

export default async function GoalDetailPage({ params }: { params: { id: string } }) {
  const userId = await getUserId()

  const [goal, allGoals] = await Promise.all([
    prisma.goal.findFirst({
      where: { id: params.id, userId },
      include: {
        projects: {
          include: {
            tasks: { where: { status: { not: 'cancelled' } }, orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }] },
          },
          orderBy: { suggestedOrder: 'asc' },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { task: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.goal.findMany({ where: { userId, status: 'active' }, select: { id: true, domainId: true, name: true, progress: true } }),
  ])

  if (!goal) notFound()

  const taskIds = goal.projects.flatMap((p) => p.tasks.map((t) => t.id))
  const calendarEvents = taskIds.length > 0 ? await prisma.calendarEvent.findMany({
    where: { taskId: { in: taskIds }, userId },
    orderBy: { startAt: 'asc' },
    take: 50,
  }) : []

  const allTasks = goal.projects.flatMap((p) => p.tasks)
  const doneTasks = allTasks.filter((t) => t.status === 'done').length
  const totalTasks = allTasks.length
  const domainColor = DOMAIN_COLORS[goal.domainId] ?? '#6366f1'

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={allGoals} />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>
            ← Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ProgressRing progress={goal.progress} size={72} color={domainColor} label={`${Math.round(goal.progress * 100)}%`} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ padding: '2px 10px', borderRadius: 4, background: domainColor + '22', color: domainColor, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  {goal.domainId}
                </span>
                <span style={{ padding: '2px 10px', borderRadius: 4, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                  {goal.status}
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>{goal.name}</h1>
              <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>{goal.definition}</p>
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
            <Stat label="Projects" value={String(goal.projects.length)} />
            <Stat label="Total tasks" value={String(totalTasks)} />
            <Stat label="Completed" value={`${doneTasks}/${totalTasks}`} />
            <Stat label="Check method" value={goal.checkMethod} />
          </div>
        </div>

        {/* Projects + Tasks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Projects List */}
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Projects</h2>
            {goal.projects.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No projects yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {goal.projects.map((p) => {
                  const pDone = p.tasks.filter((t) => t.status === 'done').length
                  const pTotal = p.tasks.length
                  const pProgress = pTotal > 0 ? pDone / pTotal : 0
                  return (
                    <div key={p.id} style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                          {p.description && <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 2 }}>{p.description}</div>}
                        </div>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{pDone}/{pTotal}</span>
                      </div>
                      <div style={{ marginTop: 8, height: 3, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pProgress * 100}%`, background: domainColor, borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tasks List with filter */}
          <GoalTasksPanel tasks={allTasks} domainColor={domainColor} />
        </div>

        {/* Calendar Timeline */}
        {calendarEvents.length > 0 && (
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Scheduled Timeline</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {calendarEvents.slice(0, 10).map((e) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--color-bg-primary)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: e.color ?? domainColor }} />
                  <div>
                    <div style={{ fontSize: 13 }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {new Date(e.startAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' '}
                      {new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {' – '}
                      {new Date(e.endAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Log */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Activity</h2>
          {goal.activityLogs.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No activity yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {goal.activityLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11, whiteSpace: 'nowrap', paddingTop: 1 }}>
                    {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {formatAction(log.action, log.task?.name, log.metadata as Record<string, unknown>)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <QuickAdd />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

type Task = {
  id: string
  name: string
  status: string
  priority: string
  scheduledAt: Date | null
  duration: number
  domainId: string | null
}

function GoalTasksPanel({ tasks, domainColor }: { tasks: Task[]; domainColor: string }) {
  // Server component can't have interactive state, so we render all tasks grouped
  const byStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
  }

  const PRIORITY_DOT: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Tasks ({tasks.length})</h2>
      {tasks.length === 0 ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No tasks yet.</div>
      ) : (
        <div>
          {(['in_progress', 'todo', 'done'] as const).map((status) => {
            const group = byStatus[status]
            if (group.length === 0) return null
            return (
              <div key={status} style={{ marginBottom: 16 }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {status.replace('_', ' ')} ({group.length})
                </div>
                {group.map((t) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
                    borderBottom: '1px solid var(--color-border)', opacity: t.status === 'done' ? 0.5 : 1,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_DOT[t.priority] ?? 'var(--color-text-muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--color-text-muted)' : '#221F1A' }}>
                      {t.name}
                    </div>
                    {t.scheduledAt && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        {new Date(t.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{t.duration}m</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatAction(action: string, taskName?: string | null, metadata?: Record<string, unknown>): string {
  switch (action) {
    case 'task_completed': return `Completed: ${taskName ?? (metadata?.name as string) ?? 'task'}`
    case 'task_created': return `Created: ${taskName ?? (metadata?.name as string) ?? 'task'}`
    case 'goal_updated': return `Goal updated`
    case 'goal_created': return `Goal created`
    case 'drift_detected': return `Drift signal: ${(metadata?.emotion as string) ?? 'stress'} detected`
    default: return action.replace(/_/g, ' ')
  }
}
