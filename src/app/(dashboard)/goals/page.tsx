/**
 * /goals — Goals organized by time horizon.
 *
 * Goals of different time scales (this week … 5-year) live together but stay
 * visually distinct: one section per horizon, near-term → long-term. Weekly &
 * monthly goals surface an honest, data-derived reminder (next action, tasks
 * left, days-to-target / pace) and a "break this down" affordance when empty.
 */
import { getServerAppUserId } from '@/lib/auth/server-user'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { QuickAdd } from '@/components/dashboard/QuickAdd'
import { GoalComposer } from '@/components/dashboard/GoalComposer'
import { HORIZONS, HORIZON_LABELS, HORIZON_ORDER, isNearTerm, buildGoalReminder, normalizeHorizon, type Horizon } from '@/lib/horizons'
import Link from 'next/link'

async function getUserId(): Promise<string> {
  return await getServerAppUserId('/goals')
}

const DOMAIN_COLORS: Record<string, string> = {
  career: '#3F6C8E', wealth: '#B08637', health: '#4F7A52',
  relationships: '#B5652F', learning: '#3E8494', legacy: '#7E5A94',
}
const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}

const REMINDER_COLORS: Record<string, string> = {
  overdue: '#B5652F', 'due-soon': '#B08637', 'on-track': '#4F7A52', 'break-down': '#7E5A94',
}

export default async function GoalsPage() {
  const userId = await getUserId()

  const goals = await prisma.goal.findMany({
    where: { userId, status: { in: ['active', 'paused'] } },
    include: {
      projects: {
        select: {
          id: true,
          tasks: {
            where: { status: { not: 'cancelled' } },
            select: { status: true, name: true, priority: true, scheduledAt: true },
            orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const sidebarGoals = goals.map((g) => ({ id: g.id, domainId: g.domainId, name: g.name, progress: g.progress }))

  // Group goals by horizon (default 'yearly' for legacy rows).
  const byHorizon = new Map<Horizon, typeof goals>()
  for (const h of HORIZONS) byHorizon.set(h, [])
  for (const g of goals) {
    const h = normalizeHorizon((g as { horizon?: string }).horizon)
    byHorizon.get(h)!.push(g)
  }

  const now = new Date()

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={sidebarGoals} />

      <main style={{ flex: 1, padding: '32px clamp(20px, 4vw, 44px)', overflowY: 'auto', maxWidth: 1120, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 6 }}>← Dashboard</Link>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>Goals</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: 13.5 }}>
              Across every horizon — from this week to the next five years.
            </p>
          </div>
          <GoalComposer />
        </div>

        {goals.length === 0 ? (
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--color-accent)' }}>◎</div>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>No active goals yet.</div>
            <Link href="/onboarding/goals" style={{ color: 'var(--color-accent)', fontSize: 14, fontWeight: 600 }}>Set up your first goal →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {[...HORIZONS].sort((a, b) => HORIZON_ORDER[a] - HORIZON_ORDER[b]).map((h) => {
              const section = byHorizon.get(h)!
              if (section.length === 0) return null
              return (
                <section key={h}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {HORIZON_LABELS[h]}
                    </h2>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{section.length} goal{section.length === 1 ? '' : 's'}</span>
                    {isNearTerm(h) && (
                      <span style={{ fontSize: 10.5, color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>· near-term focus</span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
                    {section.map((g) => {
                      const allTasks = g.projects.flatMap((p) => p.tasks)
                      const doneTasks = allTasks.filter((t) => t.status === 'done').length
                      const totalTasks = allTasks.length
                      const nextTask = allTasks.find((t) => t.status !== 'done')
                      const domainColor = DOMAIN_COLORS[g.domainId] ?? 'var(--color-accent)'
                      const targetDate = (g as { targetDate?: Date | null }).targetDate ?? null

                      const reminder = buildGoalReminder({
                        name: g.name,
                        horizon: h,
                        progress: g.progress,
                        targetDate,
                        createdAt: g.createdAt,
                        totalTasks,
                        doneTasks,
                        nextTaskName: nextTask?.name ?? null,
                      }, now)

                      return (
                        <div key={g.id} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20, boxShadow: '0 8px 24px rgba(34, 31, 26, 0.04)' }}>
                          <Link href={`/goals/${g.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
                              <ProgressRing progress={g.progress} size={52} color={domainColor} label={`${Math.round(g.progress * 100)}%`} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                  <span style={{ fontSize: 15 }}>{DOMAIN_ICONS[g.domainId]}</span>
                                  <span style={{ fontSize: 10, color: domainColor, fontWeight: 700, textTransform: 'uppercase' }}>{g.domainId}</span>
                                  {targetDate && (
                                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                                      🎯 {new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--color-text-primary)' }}>{g.name}</div>
                                <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 3, lineHeight: 1.45 }}>{g.definition.slice(0, 72)}{g.definition.length > 72 ? '…' : ''}</div>
                              </div>
                            </div>

                            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginBottom: reminder ? 10 : 0 }}>
                              {doneTasks}/{totalTasks} tasks · {g.projects.length} projects
                            </div>
                          </Link>

                          {/* Near-term reminder — honest, derived from tasks + target date */}
                          {reminder && (
                            <div style={{
                              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 11px', borderRadius: 10,
                              background: 'var(--color-bg-primary)', border: `1px solid var(--color-border)`,
                              borderLeft: `3px solid ${REMINDER_COLORS[reminder.level]}`,
                            }}>
                              <span style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-secondary)', flex: 1 }}>
                                {reminder.message}
                              </span>
                              {reminder.needsBreakdown && (
                                <Link href={`/goals/${g.id}`} style={{ fontSize: 11.5, fontWeight: 700, color: REMINDER_COLORS['break-down'], whiteSpace: 'nowrap', textDecoration: 'none' }}>
                                  Break down →
                                </Link>
                              )}
                            </div>
                          )}

                          {/* Progress bar */}
                          <div style={{ marginTop: 12, height: 4, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${g.progress * 100}%`, background: domainColor, borderRadius: 2 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>

      <QuickAdd />
    </div>
  )
}
