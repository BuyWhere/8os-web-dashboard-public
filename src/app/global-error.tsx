'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Pillar 3: global-error renders outside PostHog provider, call singleton directly
    try { posthog.captureException(error) } catch { /* not initialized yet */ }
  }, [error])

  return (
    <html>
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          background: '#0a0a0a',
          color: 'var(--color-border)',
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
          A critical error occurred. We've been notified and are working on a fix.
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
      </body>
    </html>
  )
}
