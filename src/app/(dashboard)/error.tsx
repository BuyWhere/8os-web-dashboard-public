'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard] render error', error)
  }, [error])

  return (
    <div
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
      }}
    >
      <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
        Couldn&apos;t load this page
      </h2>
      <p style={{ margin: 0, color: 'var(--color-text-secondary, #555)', maxWidth: 420 }}>
        If you were signed in earlier, your session may have expired.
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: 6,
            border: '1px solid var(--color-border, #ddd)',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Try again
        </button>
        <Link href="/login?reason=session-expired" style={{ fontWeight: 600, alignSelf: 'center' }}>
          Sign in again
        </Link>
      </div>
    </div>
  )
}
