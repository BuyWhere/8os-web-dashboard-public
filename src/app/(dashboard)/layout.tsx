/**
 * Layout for authenticated dashboard routes.
 * JWT protection is handled by middleware; this just sets the HTML structure.
 */
import AssistantPanel from '@/components/assistant/AssistantPanel'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AssistantPanel />
    </>
  )
}
