/**
 * /goals — Goals list page
 */
import { getServerAppUserId } from '@/lib/auth/server-user'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { QuickAdd } from '@/components/dashboard/QuickAdd'
import Link from 'next/link'

async function getUserId(): Promise<string> {
  // Clerk is the source of truth (2026-07-10). Resolves the Clerk session
  // to an app User.id (lazy-provisioning if needed) or redirects to /login.
  return await getServerAppUserId('/goals')
}

const DOMAIN_COLORS: Record<string, string> = {
  career: '#3F6C8E', wealth: '#B08637', health: '#4F7A52',
  relationships: '#B5652F', learning: '#3E8494', legacy: '#7E5A94',
}

const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}

export default async function GoalsPage() {
  const userId = await getUserId()

  const goals = await prisma.goal.findMany({
    where: { userId, status: { in: ['active', 'paused'] } },
    include: {
      projects: { select: { id: true, tasks: { where: { status: { not: 'cancelled' } }, select: { status: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const sidebarGoals = goals.map((g) => ({ id: g.id, domainId: g.domainId, name: g.name, progress: g.progress }))

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: '#F7F3EC', color: '#221F1A' }}>
      <Sidebar goals={sidebarGoals} />

      <main style={{ flex: 1, padding: '32px clamp(20px, 4vw, 44px)', overflowY: 'auto', maxWidth: 1120, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <Link href="/dashboard" style={{ color: '#8A8175', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 6 }}>← Dashboard</Link>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', color: '#221F1A' }}>Goals</h1>
          </div>
        </div>

        {goals.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1px solid #E7DFD2', borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12, color: '#B08637' }}>◎</div>
            <div style={{ color: '#6B6257', marginBottom: 16 }}>No active goals yet.</div>
            <Link href="/onboarding/goals" style={{ color: '#B08637', fontSize: 14, fontWeight: 600 }}>Set up your first goal →</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {goals.map((g) => {
              const allTasks = g.projects.flatMap((p) => p.tasks)
              const doneTasks = allTasks.filter((t) => t.status === 'done').length
              const totalTasks = allTasks.length
              const domainColor = DOMAIN_COLORS[g.domainId] ?? '#B08637'

              return (
                <Link key={g.id} href={`/goals/${g.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#FFFFFF', border: '1px solid #E7DFD2', borderRadius: 16, padding: 20,
                    boxShadow: '0 8px 24px rgba(34, 31, 26, 0.04)', transition: 'border-color 0.15s', cursor: 'pointer',
                  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                      <ProgressRing progress={g.progress} size={56} color={domainColor} label={`${Math.round(g.progress * 100)}%`} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>{DOMAIN_ICONS[g.domainId]}</span>
                          <span style={{ fontSize: 10, color: domainColor, fontWeight: 700, textTransform: 'uppercase' }}>{g.domainId}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14.5, color: '#221F1A' }}>{g.name}</div>
                        <div style={{ fontSize: 12.5, color: '#6B6257', marginTop: 3, lineHeight: 1.45 }}>{g.definition.slice(0, 80)}{g.definition.length > 80 ? '…' : ''}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 11.5, color: '#8A8175' }}>
                        {doneTasks}/{totalTasks} tasks · {g.projects.length} projects
                      </div>
                      <span style={{ padding: '2px 9px', borderRadius: 999, background: g.status === 'active' ? '#E7EFE0' : '#F2E9D6', color: g.status === 'active' ? '#3C5C3E' : '#8A8175', fontSize: 10.5, fontWeight: 600 }}>
                        {g.status}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginTop: 14, height: 4, background: '#F2E9D6', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${g.progress * 100}%`, background: domainColor, borderRadius: 2 }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <QuickAdd />
    </div>
  )
}
