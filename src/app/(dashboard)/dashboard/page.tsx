/**
 * /dashboard — JWT-protected dashboard page (Task 6)
 * Server component: fetches real data, renders responsive grid.
 */
import { getServerAppUserId } from '@/lib/auth/server-user'
import { currentUser } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify, importSPKI } from 'jose'
import { prisma } from '@/lib/db/prisma'
import { orderTasksByEnergyHours } from '@/lib/scheduling/engine'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { CalendarMini } from '@/components/dashboard/CalendarMini'
import { caldiyApi } from '@/lib/caldiy/client'
import { syncStaleGoogleSources } from '@/lib/external/google-calendar'
import { syncStaleMicrosoftSources } from '@/lib/external/microsoft-calendar'
import { QuickAdd } from '@/components/dashboard/QuickAdd'
import { InsightDisplayCard } from '@/components/dashboard/InsightDisplayCard'
import { AlignmentPanel } from '@/components/dashboard/AlignmentPanel'
import { DailyBig3 } from '@/components/dashboard/DailyBig3'
import { GoalHygieneCard } from '@/components/dashboard/GoalHygieneCard'
import { getDailyInsight } from '@/lib/deepseek/insights'
import { getUserTimezone, userLocalHour, userLocalDate } from '@/lib/user-time'
import { monthlyPillar } from '@/lib/bazi-phases'
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

const DEFAULT_ENERGY: Record<number, 'green' | 'yellow' | 'red'> = Object.fromEntries(
  Array.from({ length: 24 }, (_, i) => {
    if (i >= 9 && i <= 11) return [i, 'green' as const]
    if (i >= 14 && i <= 16) return [i, 'green' as const]
    if ((i >= 6 && i <= 8) || (i >= 13 && i <= 17)) return [i, 'yellow' as const]
    return [i, 'red' as const]
  })
)

type InsightPriority = 'high' | 'medium' | 'low'

async function getUserId(): Promise<string> {
  // Clerk is the source of truth (2026-07-10). Resolves the Clerk session
  // to an app User.id (lazy-provisioning if needed) or redirects to /login.
  return await getServerAppUserId('/dashboard')
}

export default async function DashboardPage() {
  const userId = await getUserId()

  // On-view freshness: pull recent Google changes so "This week" reflects the
  // real calendar (incremental, best-effort, ≤60s-throttled).
  await Promise.all([
    syncStaleGoogleSources(userId).catch(() => {}),
    syncStaleMicrosoftSources(userId).catch(() => {}),
  ])

  const now = new Date()
  // E-0 (OS-2651): "today" and the greeting must derive from the USER's
  // local civil time, not the server's. Resolve the stored timezone first.
  const timezone = await getUserTimezone(userId)
  // User-local calendar day → UTC bounds for "today" task queries.
  const { year: ly, month: lm, day: ld } = userLocalDate(timezone, now)
  const todayStart = new Date(Date.UTC(ly, lm - 1, ld, 0, 0, 0, 0))
  const todayEnd = new Date(Date.UTC(ly, lm - 1, ld, 23, 59, 59, 999))
  // "This week" box: fetch the whole current calendar week (Mon..Sun by
  // default) so a selected earlier-today / past-this-week day still shows its
  // items — not just events from `now` forward.
  const weekStartAt = new Date(todayStart.getTime())
  // JS getUTCDay: 0=Sun..6=Sat. Default first-day = Monday (see note in
  // CalendarMini re: first-day-of-week preference, wired defensively there).
  const dowUTC = weekStartAt.getUTCDay()
  weekStartAt.setUTCDate(weekStartAt.getUTCDate() - (dowUTC === 0 ? 6 : dowUTC - 1))
  const weekEnd = new Date(weekStartAt.getTime() + 7 * 86400000) // exclusive end of week

  const [user, archetype, goals, todayTasksRaw, energyProfileRaw, settings, upcomingEvents, completedThisWeek, streakDays, userProfile, externalWeekRaw] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } }),
      prisma.archetypeResult.findUnique({ where: { userId } }),
      prisma.goal.findMany({ where: { userId, status: 'active' }, orderBy: { createdAt: 'asc' } }),
      prisma.oSTask.findMany({ where: { userId, scheduledAt: { gte: todayStart, lte: todayEnd }, status: { not: 'cancelled' } }, orderBy: { scheduledAt: 'asc' } }),
      prisma.energyProfile.findUnique({ where: { userId } }),
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.calendarEvent.findMany({ where: { userId, startAt: { gte: weekStartAt, lt: weekEnd } }, orderBy: { startAt: 'asc' }, take: 60 }),
      prisma.activityLog.count({ where: { userId, action: 'task_completed', createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } } }),
      computeStreak(userId),
      prisma.userProfile.findUnique({ where: { userId }, select: { birthTimezone: true } }),
      // Google/external events for the same week — surfaced in "This week".
      prisma.externalEvent.findMany({ where: { userId, isDeleted: false, startsAt: { gte: weekStartAt, lt: weekEnd } }, orderBy: { startsAt: 'asc' }, take: 60, select: { id: true, externalId: true, title: true, startsAt: true, endsAt: true } }),
    ])

  // External (Google) week events, deduped against events 8os itself pushed
  // (those already appear via `upcomingEvents`, matched on googleEventId).
  const ownedGoogleIds = new Set(upcomingEvents.map((e) => e.googleEventId).filter((x): x is string => !!x))
  const externalMiniEvents = externalWeekRaw
    .filter((x) => !ownedGoogleIds.has(x.externalId))
    .map((x) => ({ id: `ext-${x.id}`, title: x.title ?? 'Busy', startAt: x.startsAt.toISOString(), endAt: x.endsAt.toISOString(), domainId: null, color: 'var(--color-text-muted)' }))

  let caldiyBookings: { id: string; title: string; startTime: string; endTime: string }[] = []
  try {
    const bookingsData = await caldiyApi.bookings.list({ status: 'accepted', limit: 10 })
    caldiyBookings = (bookingsData.bookings || []).filter((b: { startTime: string }) => {
      const start = new Date(b.startTime)
      return start >= now && start <= weekEnd
    })
  } catch (e) {
    console.error('Failed to fetch Cal.diy bookings for dashboard:', e)
  }

  const caldiyMiniEvents = caldiyBookings.map((b) => ({
    id: `caldiy-${b.id}`,
    title: b.title,
    startAt: b.startTime,
    endAt: b.endTime,
    domainId: null,
    color: '#3b82f6',
  }))

  const energyMap = (energyProfileRaw?.hourMap as Record<number, 'green' | 'yellow' | 'red'>) ?? DEFAULT_ENERGY

  const todayTasksOrdered = orderTasksByEnergyHours(
    todayTasksRaw.map((t) => ({ id: t.id, scheduledAt: t.scheduledAt, energyRequired: t.energyRequired, priority: t.priority })),
    energyMap
  )
  const todayTaskMap = new Map(todayTasksRaw.map((t) => [t.id, t]))
  const todayTasks = todayTasksOrdered.map((t) => todayTaskMap.get(t.id)!)


  const greeting = getGreeting(userLocalHour(timezone, now))
  // First name for the greeting: prefer the Clerk profile firstName (the name
  // captured at sign-up / onboarding), then any leading token of the Clerk
  // full name, and finally the email local-part — so a real name shows, never
  // a generic label. Clerk is the source of truth for names (2026-07-10).
  const clerkUser = await currentUser().catch(() => null)
  const userName = resolveFirstName(
    clerkUser?.firstName,
    clerkUser?.fullName,
    user?.email ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? null,
  )
  const archetypeName = archetype?.archetypeName ?? 'Explorer'
  const insightResult = await getDailyInsight(userId, userProfile?.birthTimezone ?? 'UTC')
  const insightFeedback = await prisma.dailyInsight.findUnique({
    where: { userId_date: { userId, date: insightResult.date } },
    include: { feedback: true },
  })
  const insightPriority = deriveInsightPriority(todayTasks)
  const insightPriorityReason = getInsightPriorityReason(insightPriority, todayTasks.length, goals.length)

  const serif = 'var(--font-serif), Georgia, serif'
  // Date label rendered in the user's timezone (not the server's).
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone })

  // ── Weekly reminder (this-week focus) ────────────────────────────────
  // Honest + brief: the current 流月 solar-month theme (pure date math, no
  // birth data needed) + the user's top weekly priority (first active goal).
  const solarMonth = monthlyPillar(now)
  const topGoal = goals[0] ?? null
  const weeklyReminder = {
    theme: `${solarMonth.termEn} · ${solarMonth.termName}`,
    focus: topGoal
      ? `Keep attention on ${topGoal.name} this week.`
      : 'No active goal set — pick one focus to move this week.',
    domain: topGoal ? (DOMAIN_ICONS[topGoal.domainId] ?? '🎯') : '🎯',
  }
  const briefLine = todayTasks.length === 0
    ? 'A clear day. Choose one thing that moves a goal forward.'
    : `${todayTasks.length} scheduled ${todayTasks.length === 1 ? 'task' : 'tasks'} today · ${completedThisWeek} done this week.`

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <PostHogIdentify userId={userId} accountId={userId} archetypeName={archetypeName} />
      <Sidebar goals={goals} initialCollapsed={settings?.sidebarCollapsed ?? false} />

      <main style={{ flex: 1, overflowY: 'auto', padding: '32px clamp(20px, 4vw, 44px)', maxWidth: 1120, margin: '0 auto', width: '100%' }}>

        {/* ── Greeting + today's pillar ─────────────────────────────── */}
        <header style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 8 }}>
            {todayLabel}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: serif, fontSize: 34, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--color-text-primary)' }}>
                {greeting}, {userName}.
              </h1>
              <p style={{ margin: '10px 0 0', color: 'var(--color-text-secondary)', fontSize: 15.5, maxWidth: 560, lineHeight: 1.55 }}>
                {archetype ? <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{archetypeName}</span> : null}
                {archetype ? ' · ' : ''}{briefLine}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <StatChip value={String(streakDays)} label="day streak" />
              <StatChip value={String(completedThisWeek)} label="done this week" />
              <StatChip value={String(goals.length)} label="active goals" />
            </div>
          </div>
        </header>

        {/* ── Daily brief (insight) — the one thing to read first ────── */}
        <Section serif={serif} title="Your daily brief" href="/dashboard/briefing" cta="Full briefing">
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
          <WeeklyReminder serif={serif} reminder={weeklyReminder} />
        </Section>

        {/* ── Today's focus (Big 3) + this week ──────────────────────── */}
        <Section serif={serif} title="Today's focus">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 20 }} className="dash-grid-2">
            <Card>
              <DailyBig3 />
              {todayTasks.length > 0 && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Scheduled today</div>
                  {todayTasks.slice(0, 5).map((t) => {
                    const energy = t.scheduledAt ? (energyMap[t.scheduledAt.getHours()] ?? 'red') : 'red'
                    const energyColor = energy === 'green' ? '#4F7A52' : energy === 'yellow' ? 'var(--color-accent)' : 'var(--color-accent-2)'
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', opacity: t.status === 'done' ? 0.55 : 1 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: energyColor, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: 13.5, color: 'var(--color-text-primary)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.name}</div>
                        {t.scheduledAt && (
                          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                            {new Date(t.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {t.duration}m
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
            <Card>
              <CardHead serif={serif} title="This week" href="/calendar" cta="Calendar" />
              <CalendarMini
                timezone={timezone}
                events={[
                  ...upcomingEvents.map((e) => ({ id: e.id, title: e.title, startAt: e.startAt.toISOString(), endAt: e.endAt.toISOString(), domainId: e.domainId, color: e.color })),
                  ...externalMiniEvents,
                  ...caldiyMiniEvents,
                ]}
              />
            </Card>
          </div>
        </Section>

        {/* ── Alignment — are you on the right goal this season ───────── */}
        <Section serif={serif} title="Alignment" subtitle="Is your attention on the right goal for this season?">
          <AlignmentPanel gapPx={0} />
        </Section>

        {/* ── Goals momentum ─────────────────────────────────────────── */}
        <Section serif={serif} title="Goals momentum" href="/goals" cta="All goals">
          <GoalHygieneCard />
          <Card>
            {goals.length === 0 ? (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                No active goals yet. <Link href="/onboarding/goals" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Add one →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22 }}>
                {goals.map((g) => (
                  <Link key={g.id} href={`/goals/${g.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <ProgressRing progress={g.progress} size={64} color={DOMAIN_COLORS[g.domainId] ?? 'var(--color-accent)'} label={`${Math.round(g.progress * 100)}%`} />
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.name}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </Section>

        {/* ── Reflect — quick links ──────────────────────────────────── */}
        <Section serif={serif} title="Reflect">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <QuickLink href="/dashboard/journal" title="Journal" body="Capture what happened today." />
            <QuickLink href="/dashboard/retro" title="Retro" body="Look back on the week." />
            <QuickLink href="/dashboard/memory" title="Memory" body="What the OS has learned about you." />
            <QuickLink href="/dashboard/vision" title="Vision" body="Where all of this is headed." />
          </div>
        </Section>
      </main>

      <QuickAdd />

      <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 860px){ .dash-grid-2{ grid-template-columns: 1fr !important; } }` }} />
    </div>
  )
}

// ── Warm editorial layout primitives ──────────────────────────────────────
function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 14px', textAlign: 'center', minWidth: 78 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 22 }}>
      {children}
    </div>
  )
}

function CardHead({ serif, title, href, cta }: { serif: string; title: string; href?: string; cta?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontFamily: serif, fontSize: 17, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</h3>
      {href && cta && <Link href={href} style={{ color: 'var(--color-accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{cta} →</Link>}
    </div>
  )
}

function Section({ serif, title, subtitle, href, cta, children }: { serif: string; title: string; subtitle?: string; href?: string; cta?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 34 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: serif, fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}>{title}</h2>
          {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>{subtitle}</p>}
        </div>
        {href && cta && <Link href={href} style={{ color: 'var(--color-accent)', fontSize: 13.5, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>{cta} →</Link>}
      </div>
      {children}
    </section>
  )
}

function QuickLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ width: 28, height: 2, background: 'var(--color-accent)', marginBottom: 12 }} />
      <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{body}</div>
    </Link>
  )
}

function WeeklyReminder({ serif, reminder }: { serif: string; reminder: { theme: string; focus: string; domain: string } }) {
  return (
    <div
      style={{
        marginTop: 12,
        background: 'var(--color-surface, #FFFFFF)',
        border: '1px solid var(--color-border, var(--color-border))',
        borderLeft: '3px solid var(--color-accent, var(--color-accent))',
        borderRadius: 14,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div style={{ fontSize: 20, lineHeight: 1.2, flexShrink: 0 }} aria-hidden>{reminder.domain}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-accent, var(--color-accent))', marginBottom: 3 }}>
          This week · {reminder.theme}
        </div>
        <div style={{ fontFamily: serif, fontSize: 15.5, color: 'var(--color-ink, #221F1A)', lineHeight: 1.45 }}>
          {reminder.focus}
        </div>
      </div>
    </div>
  )
}

/**
 * Resolve a display first name for the greeting.
 * Order: Clerk firstName → first token of Clerk fullName → email local-part.
 * Falls back to 'there' only when nothing usable exists.
 */
function resolveFirstName(
  firstName: string | null | undefined,
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  const first = firstName?.trim()
  if (first) return first

  const fromFull = fullName?.trim().split(/\s+/)[0]
  if (fromFull) return fromFull

  const local = email?.split('@')[0]?.trim()
  if (local) return local

  return 'there'
}

function getGreeting(h: number): string {
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
