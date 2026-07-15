/**
 * /dashboard/journal — Journal page
 *
 * Journal is a Pro feature. Free users see an upgrade prompt instead of a
 * silent redirect to /pricing (which was the old broken behaviour).
 */
import { getServerAppUserId } from '@/lib/auth/server-user'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify, importSPKI } from 'jose'
import { prisma } from '@/lib/db/prisma'
import { getUserPlan } from '@/lib/subscription'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { JournalClient } from '@/components/journal/JournalClient'
import Link from 'next/link'

type UserRole = 'user' | 'premium' | 'pro' | 'admin'

async function getUser(): Promise<{ userId: string; role: UserRole }> {
  // Clerk is the source of truth (2026-07-10). Resolve the session -> app
  // user, then read the role from the app user row.
  const userId = await getServerAppUserId('/dashboard/journal')
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  return { userId, role: ((u?.role as UserRole) ?? 'user') }
}

export default async function JournalPage() {
  const { userId, role } = await getUser()

  const [goals, settings] = await Promise.all([
    prisma.goal.findMany({ where: { userId, status: 'active' }, orderBy: { createdAt: 'asc' } }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ])

  const sidebarGoals = goals.map((g) => ({ id: g.id, domainId: g.domainId, name: g.name, progress: g.progress }))
  // Pro entitlement comes from the SUBSCRIPTION (source of truth, set by the Stripe
  // webhook), NOT user.role — the webhook never writes role, so paid users were
  // wrongly gated here while /settings/billing correctly showed Pro.
  const plan = await getUserPlan(userId)
  const isPro = plan === 'pro' || role === 'admin'

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={sidebarGoals} initialCollapsed={settings?.sidebarCollapsed ?? false} />

      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 28 }}>
          <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>Journal</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Reflect, record, and grow
          </p>
        </div>

        {!isPro ? (
          /* ── Upgrade prompt (replaces the old silent /pricing redirect) ── */
          <div style={{ maxWidth: 520 }}>
            <div style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, var(--color-bg-primary) 100%)',
              border: '1px solid var(--color-accent)33',
              borderRadius: 16, padding: '32px 36px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📔</div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>Journal is a Pro feature</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
                Unlock the 8os Journal to capture daily reflections, track mood patterns,
                and surface long-term insights from your writing, powered by your archetype.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, textAlign: 'left' }}>
                {[
                  'AI-summarised daily entries',
                  'Mood and energy trend tracking',
                  'Archetype-aware journaling prompts',
                  'Weekly reflection synthesis',
                ].map((feature) => (
                  <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--color-accent)', fontSize: 14 }}>✦</span>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: 13 }}>{feature}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/pricing?upgrade=pro&feature=journal"
                style={{
                  display: 'inline-block',
                  background: 'var(--color-accent)', color: '#FFFFFF',
                  padding: '12px 28px', borderRadius: 10,
                  textDecoration: 'none', fontSize: 14, fontWeight: 600,
                }}
              >
                Upgrade to Pro →
              </Link>
              <div style={{ marginTop: 12, color: 'var(--color-text-muted)', fontSize: 12 }}>
                $18/month · cancel anytime
              </div>
            </div>
          </div>
        ) : (
          /* ── Pro user: the real journal — write anytime + read past entries ── */
          <JournalClient />
        )}
      </main>
    </div>
  )
}
