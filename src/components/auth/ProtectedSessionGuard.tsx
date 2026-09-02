'use client'

/**
 * OS-5918: stale/invalid Clerk cookies can pass middleware (token present)
 * while the client session is actually signed-out. The dashboard RSC then
 * hangs or renders nothing under the chrome — looks like a broken app.
 *
 * Once Clerk has loaded, signed-out visitors on protected routes are sent
 * to /login with a next= return path. While Clerk is still resolving, show
 * a non-blank fallback so main content is never an empty white page.
 */
import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'

export function ProtectedSessionGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const pathname = usePathname() || '/dashboard'

  useEffect(() => {
    if (!isLoaded) return
    if (isSignedIn) return
    const next = encodeURIComponent(pathname)
    router.replace(`/login?next=${next}&reason=session-expired`)
  }, [isLoaded, isSignedIn, pathname, router])

  if (!isLoaded) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: 'calc(100vh - var(--header-height, 64px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          color: 'var(--color-text-secondary, #555)',
          background: 'var(--color-bg-primary, #fafaf8)',
        }}
      >
        Checking session…
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div
        role="status"
        style={{
          minHeight: 'calc(100vh - var(--header-height, 64px))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--color-bg-primary, #fafaf8)',
          color: 'var(--color-text-primary, #1a1a1a)',
        }}
      >
        <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
          Session expired — sign in again
        </p>
        <p style={{ margin: 0, color: 'var(--color-text-secondary, #555)', maxWidth: 420 }}>
          Your saved session is no longer valid. Redirecting to sign in.
        </p>
        <a
          href={`/login?next=${encodeURIComponent(pathname)}&reason=session-expired`}
          style={{ fontWeight: 600, color: 'var(--color-accent, #8A6728)' }}
        >
          Sign in
        </a>
      </div>
    )
  }

  return <>{children}</>
}
