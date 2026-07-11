import { BriefingSkeleton } from '@/components/dashboard/BriefingContent'
import { DashboardPageStyles } from '@/components/dashboard/page-state'
import { pageMainStyle, pageShellStyle } from '@/components/dashboard/page-style'

export default function Loading() {
  return (
    <div style={pageShellStyle}>
      <main style={pageMainStyle}>
        <DashboardPageStyles />
        <div style={{ marginBottom: 28 }}>
          <div style={{ color: '#555', fontSize: 13, marginBottom: 4 }}>← Dashboard</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Daily Briefing</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <BriefingSkeleton showSlowMessage={false} />
      </main>
    </div>
  )
}
