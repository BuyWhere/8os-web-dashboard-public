/**
 * /dashboard/archetype/compare — Compare all archetypes
 */
import { getServerAppUserId } from '@/lib/auth/server-user'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify, importSPKI } from 'jose'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ARCHETYPES } from '@/lib/archetype'
import Link from 'next/link'

async function getUserId(): Promise<string> {
  // Clerk is the source of truth (2026-07-10). Resolves the Clerk session
  // to an app User.id (lazy-provisioning if needed) or redirects to /login.
  return await getServerAppUserId('/dashboard/archetype/compare')
}

export default async function CompareArchetypesPage() {
  const userId = await getUserId()

  const [userArchetype, goals, settings] = await Promise.all([
    prisma.archetypeResult.findUnique({ where: { userId } }),
    prisma.goal.findMany({ where: { userId, status: 'active' }, orderBy: { createdAt: 'asc' } }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ])

  const sidebarGoals = goals.map((g) => ({ id: g.id, domainId: g.domainId, name: g.name, progress: g.progress }))

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={sidebarGoals} initialCollapsed={settings?.sidebarCollapsed ?? false} />

      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 28 }}>
          <Link href="/dashboard/archetype" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Your Archetype</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>Compare Archetypes</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Explore all 10 archetypes and see how they differ
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {ARCHETYPES.filter((a) => a.id !== 'hybrid_explorer').map((arch) => {
            const isYours = userArchetype?.archetypeId === arch.id
            return (
              <div
                key={arch.id}
                style={{
                  background: 'var(--color-bg-card)',
                  border: `1px solid ${isYours ? arch.color + '55' : 'var(--color-border)'}`,
                  borderRadius: 14,
                  padding: 20,
                  position: 'relative',
                }}
              >
                {isYours && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    background: arch.color + '22', color: arch.color,
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
                  }}>
                    You
                  </div>
                )}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 32 }}>{arch.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{arch.name}</div>
                    <div style={{ color: arch.color, fontSize: 11, fontStyle: 'italic' }}>{arch.tagline}</div>
                  </div>
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.5 }}>{arch.description}</div>
                <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(arch.baziElementAffinity)
                    .filter(([, v]) => v >= 0.7)
                    .map(([el]) => (
                      <span key={el} style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-muted)', padding: '2px 7px', borderRadius: 4, fontSize: 10 }}>
                        {el}
                      </span>
                    ))}
                </div>
              </div>
            )
          })}

          {/* Hybrid Explorer last */}
          {(() => {
            const hybrid = ARCHETYPES.find((a) => a.id === 'hybrid_explorer')!
            const isYours = userArchetype?.archetypeId === hybrid.id
            return (
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: `1px solid ${isYours ? hybrid.color + '55' : 'var(--color-border)'}`,
                  borderRadius: 14, padding: 20, position: 'relative',
                }}
              >
                {isYours && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    background: hybrid.color + '22', color: hybrid.color,
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
                  }}>
                    You
                  </div>
                )}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 32 }}>{hybrid.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{hybrid.name}</div>
                    <div style={{ color: hybrid.color, fontSize: 11, fontStyle: 'italic' }}>{hybrid.tagline}</div>
                  </div>
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.5 }}>{hybrid.description}</div>
              </div>
            )
          })()}
        </div>
      </main>
    </div>
  )
}
