/**
 * /dashboard — JWT-protected dashboard page (Task 6)
 * Server component: fetches real data, renders responsive grid.
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify, importSPKI } from 'jose'
import { prisma } from '@/lib/db/prisma'
import { orderTasksByWorkPrefs } from '@/lib/scheduling/engine'
import { getWorkPreferences } from '@/lib/work-preferences'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { CalendarMini } from '@/components/dashboard/CalendarMini'
import { QuickAdd } from '@/components/dashboard/QuickAdd'
import { InsightDisplayCard } from '@/components/dashboard/InsightDisplayCard'
import { getDailyInsight } from '@/lib/deepseek/insights'
import Link from 'next/link'
import { PostHogIdentify } from '@/components/PostHogIdentify'

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}

const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}

const ARCHETYPE_DENSITY: Record<string, { cols: number; gapPx: number }> = {
  compact: { cols: 3, gapPx: 12 },
  balanced: { cols: 2, gapPx: 20 },
  spacious: { cols: 1, gapPx: 32 },
}

// Energy-hours removed in OS-2114; tasks now ordered by WorkPreferences (working window + priority)

type InsightPriority = 'high' | 'medium' | 'low'

async function getUserId(): Promise<string> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login?next=/dashboard')

  const pem = (process.env.JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n')
  if (!pem) redirect('/login')

  try {
    const key = await importSPKI(pem, 'RS256')
    const { payload } = await jwtVerify(token, key, { issuer: '8os' })
    return payload.sub as string
  } catch {
    redirect('/login?next=/dashboard')
  }
}

export default async function DashboardPage() {
  const userId = await getUserId()

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)

  const [user, archetype, goals, todayTasksRaw, settings, upcomingEvents, completedThisWeek, streakDays, userProfile] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } }),
      prisma.archetypeResult.findUnique({ where: { userId } }),
      prisma.goal.findMany({ where: { userId, status: 'active' }, orderBy: { createdAt: 'asc' } }),
      prisma.oSTask.findMany({ where: { userId, scheduledAt: { gte: todayStart, lte: todayEnd }, status: { not: 'cancelled' } }, orderBy: { scheduledAt: 'asc' } }),
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.calendarEvent.findMany({ where: { userId, startAt: { gte: now, lte: weekEnd } }, orderBy: { startAt: 'asc' }, take: 20 }),
      prisma.activityLog.count({ where: { userId, action: 'task_completed', createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } } }),
      computeStreak(userId),
      prisma.userProfile.findUnique({ where: { userId }, select: { birthTimezone: true } }),
    ])

  const workPreferences = await getWorkPreferences(userId)

  const todayTasksOrdered = orderTasksByWorkPrefs(
    todayTasksRaw.map((t) => ({ id: t.id, scheduledAt: t.scheduledAt, priority: t.priority })),
    workPreferences
  )
  const todayTaskMap = new Map(todayTasksRaw.map((t) => [t.id, t]))
  const todayTasks = todayTasksOrdered.map((t) => todayTaskMap.get(t.id)!)

  const density = (settings?.archetypeDensity ?? 'balanced') as 'compact' | 'balanced' | 'spacious'
  const { cols, gapPx } = ARCHETYPE_DENSITY[density]

  const greeting = getGreeting()
  const userName = user?.email?.split('@')[0] ?? 'there'
  const archetypeName = archetype?.archetypeName ?? 'Explorer'
  let insightResult = null
  let insightFeedback = null
  try {
    insightResult = await getDailyInsight(userId, userProfile?.birthTimezone ?? 'UTC')
    insightFeedback = await prisma.dailyInsight.findUnique({
      where: { userId_date: { userId, date: insightResult.date } },
      include: { feedback: true },
    })
  } catch (e) {
    console.warn('[dashboard] getDailyInsight failed, degrading gracefully:', e instanceof Error ? e.message : String(e))
  }
  const insightPriority = deriveInsightPriority(todayTasks)
  const insightPriorityReason = getInsightPriorityReason(insightPriority, todayTasks.length, goals.length)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <PostHogIdentify userId={userId} accountId={userId} archetypeName={archetypeName} />
      <Sidebar goals={goals} initialCollapsed={settings?.sidebarCollapsed ?? false} />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {/* Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
              {greeting}, {userName} ✦
            </h1>
            <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>
              {archetypeName} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{streakDays}</div>
              <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Streak</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#6366f1' }}>{completedThisWeek}</div>
              <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>This week</div>
            </div>
          </div>
        </div>

        {/* Welcome Banner */}
        {archetype && (
          <div style={{
            background: `linear-gradient(135deg, #111 0%, #0d0d18 100%)`,
            border: '1px solid #1e1e2e', borderRadius: 16, padding: '20px 24px',
            marginBottom: gapPx, display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <div style={{ fontSize: 48 }}>{archetype.archetypeId === 'pioneer' ? '🌱' : archetype.archetypeId === 'sage' ? '🌊' : archetype.archetypeId === 'catalyst' ? '🔥' : archetype.archetypeId === 'architect' ? '⚙️' : '✨'}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{archetype.archetypeName}</div>
              <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                Confidence {Math.round(archetype.confidence * 100)}% · {(archetype.dominantElements as string[]).join(', ')} dominant
                {archetype.isHybrid && <span style={{ color: '#f59e0b', marginLeft: 8 }}>Hybrid</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <span style={{ background: '#1e1e2e', color: '#888', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                  {goals.length} active goals
                </span>
                <span style={{ background: '#1e1e2e', color: '#888', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                  {todayTasks.length} tasks today
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: cols === 1 ? '1fr' : cols === 3 ? '1fr 1fr 1fr' : '2fr 1fr', gap: gapPx }}>
          {insightResult ? (
          <InsightDisplayCard
            insight={insightResult.content}
            date={insightResult.date}
            archetypeId={archetype?.archetypeId ?? 'default'}
            archetypeName={archetypeName}
            isFallback={insightResult.isFallback}
            cached={insightResult.cached}
            initialFeedback={(insightFeedback?.feedback?.rating as 1 | -1 | null | undefined) ?? null}
            priority={insightPriority}
            priorityReason={insightPriorityReason}
          />
          ) : (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 20, color: '#888', fontSize: 13 }}>
            Daily insight unavailable — check back soon.
          </div>
          )}

          {/* Goals Overview Panel */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#ededed' }}>Goals Overview</h2>
              <Link href="/goals" style={{ color: '#6366f1', fontSize: 12, textDecoration: 'none' }}>View all →</Link>
            </div>
            {goals.length === 0 ? (
              <div style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No active goals yet. <Link href="/onboarding/goals" style={{ color: '#6366f1' }}>Add one →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {goals.map((g) => (
                  <Link key={g.id} href={`/goals/${g.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <ProgressRing
                      progress={g.progress}
                      size={60}
                      color={DOMAIN_COLORS[g.domainId] ?? '#6366f1'}
                      label={`${Math.round(g.progress * 100)}%`}
                    />
                    <div style={{ fontSize: 10, color: '#888', textAlign: 'center', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {DOMAIN_ICONS[g.domainId]} {g.name}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Today's Focus Panel */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#ededed' }}>Today&apos;s Focus</h2>
              <Link href="/calendar" style={{ color: '#6366f1', fontSize: 12, textDecoration: 'none' }}>Calendar →</Link>
            </div>
            {todayTasks.length === 0 ? (
              <div style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                No tasks scheduled. Press ⌘K to add one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todayTasks.slice(0, 6).map((t) => {
                  const inWindow = t.scheduledAt != null
                    && t.scheduledAt.getHours() >= workPreferences.workingWindowStart
                    && t.scheduledAt.getHours() < workPreferences.workingWindowEnd
                  const dotColor = inWindow ? '#22c55e' : '#555'
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                      borderRadius: 8, background: '#0d0d0d', border: '1px solid #1a1a1a',
                      opacity: t.status === 'done' ? 0.5 : 1,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} title={inWindow ? 'In working window' : 'Outside working window'} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: t.status === 'done' ? '#555' : '#ededed', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                          {t.name}
                        </div>
                        {t.scheduledAt && (
                          <div style={{ fontSize: 11, color: '#555 ' }}>
                            {new Date(t.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            {' · '}{t.duration}m
                          </div>
                        )}
                      </div>
                      {t.domainId && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_COLORS[t.domainId] ?? '#666', flexShrink: 0 }} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Calendar Mini View */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#ededed' }}>This Week</h2>
              <Link href="/calendar" style={{ color: '#6366f1', fontSize: 12, textDecoration: 'none' }}>Full view →</Link>
            </div>
            <CalendarMini events={upcomingEvents.map((e) => ({
              id: e.id, title: e.title, startAt: e.startAt.toISOString(), endAt: e.endAt.toISOString(),
              domainId: e.domainId, color: e.color,
            }))} />
          </div>

          {/* Metrics Panel */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 20 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#ededed' }}>Metrics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <MetricCard label="Streak" value={`${streakDays}d`} color="#22c55e" icon="🔥" />
              <MetricCard label="Done this week" value={String(completedThisWeek)} color="#6366f1" icon="✓" />
              <MetricCard label="Active goals" value={String(goals.length)} color="#f59e0b" icon="◎" />
              <MetricCard label="Today's tasks" value={String(todayTasks.length)} color="#3b82f6" icon="✦" />
            </div>
          </div>
        </div>
      </main>

      <QuickAdd />
    </div>
  )
}

function MetricCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

function deriveInsightPriority(
  tasks: Array<{ priority: string }>,
): InsightPriority {
  const highPriorityCount = tasks.filter((task) => task.priority === 'high').length

  if (highPriorityCount > 0 || tasks.length >= 5) return 'high'
  if (tasks.length >= 3) return 'medium'
  return 'low'
}

function getInsightPriorityReason(priority: InsightPriority, taskCount: number, goalCount: number): string {
  if (priority === 'high') {
    return `${taskCount} scheduled tasks and at least one high-priority commitment make this insight worth acting on early.`
  }

  if (priority === 'medium') {
    return `${taskCount} planned tasks across ${goalCount} active goals suggest a useful signal day without immediate overload.`
  }

  return 'A lighter schedule leaves room to absorb the insight before turning it into action.'
}

async function computeStreak(userId: string): Promise<number> {
  const logs = await prisma.activityLog.findMany({
    where: { userId, action: 'task_completed' },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: { createdAt: true },
  })
  if (logs.length === 0) return 0
  const days = new Set(logs.map((l) => l.createdAt.toISOString().slice(0, 10)))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 60; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (days.has(key)) streak++
    else if (i > 0) break
  }
  return streak
}
