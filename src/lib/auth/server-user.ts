import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { resolveAppUserId } from '@/lib/auth/require-auth'

/**
 * server-user — resolve the current app User.id inside SERVER COMPONENTS (pages)
 * from the CLERK session (single source of truth as of the 2026-07-10 Clerk
 * consolidation). Replaces the legacy JWT `access_token` cookie reads that
 * bounced real Clerk users to /login forever.
 *
 * If there is no Clerk session, redirect to the sign-in URL (default /login),
 * carrying an optional `next` so the user returns to the page after login.
 * Lazily provisions the app-user row via resolveAppUserId (shared with the
 * API-route requireAuth), so onboarding/dashboard work even if the Clerk
 * webhook is inactive.
 */
export async function getServerAppUserId(nextPath?: string): Promise<string> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    redirect('/login' + (nextPath ? '?next=' + encodeURIComponent(nextPath) : ''))
  }
  try {
    return await resolveAppUserId(clerkUserId)
  } catch {
    redirect('/login' + (nextPath ? '?next=' + encodeURIComponent(nextPath) : ''))
  }
}
