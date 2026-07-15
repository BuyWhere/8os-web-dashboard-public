/**
 * /dashboard/briefing — Daily briefing page
 */
import { getServerAppUserId } from '@/lib/auth/server-user'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify, importSPKI } from 'jose'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { BriefingContent } from '@/components/dashboard/BriefingContent'
import { pageMainStyle, pageShellStyle } from '@/components/dashboard/page-style'

async function getUserId(): Promise<string> {
  // Clerk is the source of truth (2026-07-10). Resolves the Clerk session
  // to an app User.id (lazy-provisioning if needed) or redirects to /login.
  return await getServerAppUserId('/dashboard/briefing')
}

export default async function BriefingPage() {
  const userId = await getUserId()

  const [goals, settings] = await Promise.all([
    prisma.goal.findMany({ where: { userId, status: 'active' }, orderBy: { createdAt: 'asc' }, take: 5 }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ])

  const sidebarGoals = goals.map((g) => ({ id: g.id, domainId: g.domainId, name: g.name, progress: g.progress }))

  return (
    <div style={pageShellStyle}>
      <Sidebar goals={sidebarGoals} initialCollapsed={settings?.sidebarCollapsed ?? false} />
      <main style={pageMainStyle}>
        <BriefingContent />
      </main>
    </div>
  )
}
