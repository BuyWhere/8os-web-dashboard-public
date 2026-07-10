/**
 * /goals — Goals list page
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { QuickAdd } from '@/components/dashboard/QuickAdd'
import { goalTaglineForDomain, type GoalDomain } from '@/lib/goal-taglines'
import Link from 'next/link'

async function getUserId(): Promise<string> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login?next=/goals')
  const pem = (process.env.JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n')
  if (!pem) redirect('/login')
  try {
    const { importSPKI, jwtVerify } = await import('jose')
    const key = await importSPKI(pem, 'RS256')
    const { payload } = await jwtVerify(token, key, { issuer: '8os' })
    return payload.sub as string
  } catch {
    redirect('/login?next=/goals')
  }
}

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}

const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}

export default async function GoalsPage() {
  const userId = await getUserId()

  const [goals, profile] = await Promise.all([
    prisma.goal.findMany({
      where: { userId, status: { in: ['active', 'paused'] } },
      include: {
        projects: { select: { id: true, tasks: { where: { status: { not: 'cancelled' } }, select: { status: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userProfile.findUnique({
      where: { userId },
      select: { dayElement: true, dayPolarity: true, dominantElement: true },
    }),
  ])

  const sidebarGoals = goals.map((g) => ({ id: g.id, domainId: g.domainId, name: g.name, progress: g.progress }))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar goals={sidebarGoals} />

      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <Link href="/dashboard" style={{ color: '#999', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Goals</h1>
          </div>
        </div>

        {goals.length === 0 ? (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <div style={{ color: '#888', marginBottom: 16 }}>No active goals yet.</div>
            <Link href="/onboarding/goals" style={{ color: '#6366f1', fontSize: 14 }}>Set up your first goal →</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {goals.map((g) => {
              const allTasks = g.projects.flatMap((p) => p.tasks)
              const doneTasks = allTasks.filter((t) => t.status === 'done').length
              const totalTasks = allTasks.length
              const domainColor = DOMAIN_COLORS[g.domainId] ?? '#6366f1'
              const tagline = goalTaglineForDomain(profile, g.domainId as GoalDomain)

              return (
                <Link key={g.id} href={`/goals/${g.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 20,
                    transition: 'border-color 0.15s', cursor: 'pointer',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = domainColor + '44')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e1e1e')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                      <ProgressRing progress={g.progress} size={56} color={domainColor} label={`${Math.round(g.progress * 100)}%`} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>{DOMAIN_ICONS[g.domainId]}</span>
                          <span style={{ fontSize: 10, color: domainColor, fontWeight: 700, textTransform: 'uppercase' }}>{g.domainId}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#ededed' }}>{g.name}</div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{g.definition.slice(0, 80)}{g.definition.length > 80 ? '…' : ''}</div>
                        {tagline && (
                          <div style={{
                            marginTop: 8, fontSize: 11, fontStyle: 'italic', color: domainColor,
                            opacity: 0.85, lineHeight: 1.4,
                            borderLeft: `2px solid ${domainColor}55`,
                            paddingLeft: 8,
                          }}>
                            {tagline}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        {doneTasks}/{totalTasks} tasks · {g.projects.length} projects
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: g.status === 'active' ? '#22c55e22' : '#1e1e1e', color: g.status === 'active' ? '#22c55e' : '#555', fontSize: 10 }}>
                        {g.status}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginTop: 12, height: 3, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
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
