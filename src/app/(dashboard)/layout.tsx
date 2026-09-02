/**
 * Layout for authenticated dashboard routes.
 * JWT protection is handled by middleware; this just sets the HTML structure.
 * PostHogProvider is here (not in root layout) to keep the PostHog SDK (~188 KiB)
 * off public marketing pages — OS-3498 perf fix.
 *
 * OS-5918: ProtectedSessionGuard redirects stale/invalid Clerk sessions to
 * /login and never leaves main content blank.
 */
import { PostHogProvider } from '@/components/PostHogProvider'
import AssistantPanel from '@/components/assistant/AssistantPanel'
import { ProtectedSessionGuard } from '@/components/auth/ProtectedSessionGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <ProtectedSessionGuard>
        {children}
        <AssistantPanel />
      </ProtectedSessionGuard>
    </PostHogProvider>
  )
}
