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
        background: 'var(--color-bg-primary, #F7F3EC)',
        color: 'var(--color-text-primary, #221F1A)',
      }}
    >
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#221F1A' }}>Something went wrong</h2>
      <p style={{ color: '#5C5652', maxWidth: 400 }}>
        We&apos;ve been notified and are looking into it. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.5rem 1.25rem',
          background: '#8A6514',
          color: '#FFFFFF',
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
