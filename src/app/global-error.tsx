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

  // OS-6100: never paint a near-black canvas with token-based text. This
  // boundary replaces the root layout (no globals.css), so CSS variables are
  // undefined — `color: var(--color-border)` was invisible on #0a0a0a and QA
  // captured a fully blank black viewport with 0 console errors.
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          background: '#F7F3EC',
          color: '#221F1A',
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#221F1A' }}>Something went wrong</h2>
        <p style={{ color: '#5C5652', maxWidth: 400 }}>
          A critical error occurred. We&apos;ve been notified and are working on a fix.
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
      </body>
    </html>
  )
}
