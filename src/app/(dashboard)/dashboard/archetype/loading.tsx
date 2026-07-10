import { ArchetypeSkeleton } from '@/components/dashboard/ArchetypeContent'
import { DashboardPageStyles } from '@/components/dashboard/page-state'
import { pageMainStyle, pageShellStyle } from '@/components/dashboard/page-style'

export default function Loading() {
  return (
    <div style={pageShellStyle}>
      <main style={pageMainStyle}>
        <DashboardPageStyles />
        <div style={{ marginBottom: 28 }}>
          <div style={{ color: '#999', fontSize: 13, marginBottom: 4 }}>← Dashboard</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Your Archetype</h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>
            Understand your core operating style
          </p>
        </div>
        <ArchetypeSkeleton />
      </main>
    </div>
  )
}
