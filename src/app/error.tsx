'use client'

import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const posthog = usePostHog()
  useEffect(() => {
    // Pillar 3: emit $exception to PostHog error dashboard
    if (posthog) posthog.captureException(error)
  }, [error, posthog])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h2>
      <p style={{ color: '#888', maxWidth: 400 }}>
        We've been notified and are looking into it. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.5rem 1.25rem',
          background: 'var(--color-border)',
          color: '#0a0a0a',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Try again
      </button>
    </div>
  )
}
