/**
 * Layout for authenticated dashboard routes.
 * JWT protection is handled by middleware; this just sets the HTML structure.
 * PostHogProvider is here (not in root layout) to keep the PostHog SDK (~188 KiB)
 * off public marketing pages — OS-3498 perf fix.
 */
import { PostHogProvider } from '@/components/PostHogProvider'
import AssistantPanel from '@/components/assistant/AssistantPanel'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      {children}
      <AssistantPanel />
    </PostHogProvider>
  )
}
