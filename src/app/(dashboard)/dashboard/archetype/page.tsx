/**
 * /dashboard/archetype — Archetype profile page
 */
import { getServerAppUserId } from '@/lib/auth/server-user'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify, importSPKI } from 'jose'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import Link from 'next/link'
import { ArchetypeContent } from '@/components/dashboard/ArchetypeContent'
import { pageMainStyle, pageShellStyle } from '@/components/dashboard/page-style'
import { ArchetypePageShell } from '@/components/archetype/ArchetypePageShell'

async function getUserId(): Promise<string> {
  // Clerk is the source of truth (2026-07-10). Resolves the Clerk session
  // to an app User.id (lazy-provisioning if needed) or redirects to /login.
  return await getServerAppUserId('/dashboard/archetype')
}

export default async function ArchetypePage() {
  const userId = await getUserId()

  const [goals, settings] = await Promise.all([
    prisma.goal.findMany({ where: { userId, status: 'active' }, orderBy: { createdAt: 'asc' } }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ])

  const sidebarGoals = goals.map((g) => ({ id: g.id, domainId: g.domainId, name: g.name, progress: g.progress }))

  return (
    <ArchetypePageShell>
      <div style={pageShellStyle}>
        <Sidebar goals={sidebarGoals} initialCollapsed={settings?.sidebarCollapsed ?? false} />

        <main style={pageMainStyle}>
          <div style={{ marginBottom: 28 }}>
            <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>Your Archetype</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
              Understand your core operating style
            </p>
          </div>
          <ArchetypeContent />
        </main>
      </div>
    </ArchetypePageShell>
  )
}
