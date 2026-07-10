/**
 * /dashboard/journal — Journal page
 *
 * Journal is a Pro feature. Free users see an upgrade prompt instead of a
 * silent redirect to /pricing (which was the old broken behaviour).
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify, importSPKI } from 'jose'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import Link from 'next/link'

type UserRole = 'user' | 'premium' | 'pro' | 'admin'

async function getUser(): Promise<{ userId: string; role: UserRole }> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login?next=/dashboard/journal')
  const pem = (process.env.JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n')
  if (!pem) redirect('/login')
  try {
    const key = await importSPKI(pem, 'RS256')
    const { payload } = await jwtVerify(token, key, { issuer: '8os' })
    return {
      userId: payload.sub as string,
      role: (payload.role as UserRole) ?? 'user',
    }
  } catch {
    redirect('/login?next=/dashboard/journal')
  }
}

export default async function JournalPage() {
  const { userId, role } = await getUser()

  const [goals, settings] = await Promise.all([
    prisma.goal.findMany({ where: { userId, status: 'active' }, orderBy: { createdAt: 'asc' } }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ])

  const sidebarGoals = goals.map((g) => ({ id: g.id, domainId: g.domainId, name: g.name, progress: g.progress }))
  const isPro = role === 'pro' || role === 'admin'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar goals={sidebarGoals} initialCollapsed={settings?.sidebarCollapsed ?? false} />

      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 28 }}>
          <Link href="/dashboard" style={{ color: '#999', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Journal</h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>
            Reflect, record, and grow
          </p>
        </div>

        {!isPro ? (
          /* ── Upgrade prompt (replaces the old silent /pricing redirect) ── */
          <div style={{ maxWidth: 520 }}>
            <div style={{
              background: 'linear-gradient(135deg, #111 0%, #0d0d18 100%)',
              border: '1px solid #6366f133',
              borderRadius: 16, padding: '32px 36px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📔</div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Journal is a Pro feature</h2>
              <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
                Unlock the 8os Journal to capture daily reflections, track mood patterns,
                and surface long-term insights from your writing — powered by your archetype.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, textAlign: 'left' }}>
                {[
                  'AI-summarised daily entries',
                  'Mood and focus trend tracking',
                  'Archetype-aware journaling prompts',
                  'Weekly reflection synthesis',
                ].map((feature) => (
                  <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#6366f1', fontSize: 14 }}>✦</span>
                    <span style={{ color: '#ccc', fontSize: 13 }}>{feature}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/pricing?upgrade=pro&feature=journal"
                style={{
                  display: 'inline-block',
                  background: '#6366f1', color: '#fff',
                  padding: '12px 28px', borderRadius: 10,
                  textDecoration: 'none', fontSize: 14, fontWeight: 600,
                }}
              >
                Upgrade to Pro →
              </Link>
              <div style={{ marginTop: 12, color: '#888', fontSize: 12 }}>
                Starting from $12/month · cancel anytime
              </div>
            </div>
          </div>
        ) : (
          /* ── Pro user: journal interface placeholder ── */
          <div style={{ maxWidth: 720 }}>
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📔</div>
              <div style={{ color: '#888', fontSize: 15, marginBottom: 8 }}>Journal is coming soon.</div>
              <div style={{ color: '#999', fontSize: 13 }}>
                Your first entry will appear here. Check back after your next daily briefing.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
