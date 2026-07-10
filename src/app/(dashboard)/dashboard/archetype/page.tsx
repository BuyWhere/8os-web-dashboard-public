/**
 * /dashboard/archetype — Archetype profile page
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify, importSPKI } from 'jose'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import Link from 'next/link'
import { ArchetypeContent } from '@/components/dashboard/ArchetypeContent'
import { pageMainStyle, pageShellStyle } from '@/components/dashboard/page-style'

async function getUserId(): Promise<string> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login?next=/dashboard/archetype')
  const pem = (process.env.JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n')
  if (!pem) redirect('/login')
  try {
    const key = await importSPKI(pem, 'RS256')
    const { payload } = await jwtVerify(token, key, { issuer: '8os' })
    return payload.sub as string
  } catch {
    redirect('/login?next=/dashboard/archetype')
  }
}

export default async function ArchetypePage() {
  const userId = await getUserId()

  const [goals, settings] = await Promise.all([
    prisma.goal.findMany({ where: { userId, status: 'active' }, orderBy: { createdAt: 'asc' } }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ])

  const sidebarGoals = goals.map((g) => ({ id: g.id, domainId: g.domainId, name: g.name, progress: g.progress }))

  return (
    <div style={pageShellStyle}>
      <Sidebar goals={sidebarGoals} initialCollapsed={settings?.sidebarCollapsed ?? false} />

      <main style={pageMainStyle}>
        <div style={{ marginBottom: 28 }}>
          <Link href="/dashboard" style={{ color: '#999', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Your Archetype</h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>
            Understand your core operating style
          </p>
        </div>
        <ArchetypeContent />
      </main>
    </div>
  )
}
