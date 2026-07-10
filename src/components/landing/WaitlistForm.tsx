'use client'

import { FormEvent, useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

// Client-side email format check. Mirrors the server's regex in
// src/app/api/waitlist/route.ts so users get the same verdict locally
// instead of round-tripping garbage.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Please enter your email address.'
  if (trimmed.length > 254) return 'That email is too long.'
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address.'
  return null
}

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  // Honeypot: hidden field bots tend to fill, humans never see.
  const [website, setWebsite] = useState('')

  const hasFieldError = status === 'error' && message !== '' && !message.startsWith('Failed')
  const inputBorder = hasFieldError
    ? '1px solid #ef4444'
    : '1px solid rgba(255,255,255,0.1)'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMessage('')

    // Honeypot trip — silently report success so bots think they got through.
    if (website) {
      setStatus('success')
      setMessage("You're on the waitlist.")
      setEmail('')
      return
    }

    const validationError = validateEmail(email)
    if (validationError) {
      setStatus('error')
      setMessage(validationError)
      return
    }

    setStatus('loading')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json().catch(() => ({} as { error?: string }))

      if (response.ok) {
        setStatus('success')
        setMessage(`Welcome! You're #${data.position} on the waitlist.`)
        setEmail('')
      } else if (response.status === 409) {
        setStatus('error')
        setMessage('This email is already on the waitlist.')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Failed to join waitlist. Check your connection and try again.')
    }
  }

  return (
    <div
      id="waitlist"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '2rem',
        backdropFilter: 'blur(10px)',
      }}
    >
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          marginBottom: '0.5rem',
        }}
      >
        Join the Waitlist
      </h2>
      <p
        style={{
          fontSize: '0.875rem',
          color: '#888',
          marginBottom: '1.5rem',
        }}
      >
        Be the first to experience 8os when we launch.
      </p>

      {status === 'success' ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            color: '#22c55e',
          }}
        >
          {message}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-label="Join the waitlist"
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <label
            htmlFor="waitlist-email"
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
            }}
          >
            Email address
          </label>
          {/* Honeypot: visually hidden, aria-hidden, off-screen. Real users never see
              or fill this; bots that auto-fill all inputs will trip it. */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '-10000px',
              top: 'auto',
              width: 1,
              height: 1,
              overflow: 'hidden',
            }}
          >
            <label htmlFor="waitlist-website">Website</label>
            <input
              id="waitlist-website"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <input
            id="waitlist-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              // Clear stale error as the user starts correcting it.
              if (status === 'error') {
                setStatus('idle')
                setMessage('')
              }
            }}
            aria-invalid={hasFieldError}
            aria-describedby={hasFieldError ? 'waitlist-error' : undefined}
            style={{
              flex: '1 1 240px',
              padding: '0.875rem 1rem',
              fontSize: '1rem',
              background: 'rgba(0,0,0,0.4)',
              border: inputBorder,
              borderRadius: '8px',
              color: '#fff',
              outline: 'none',
              minWidth: 0,
              transition: 'border-color 0.15s',
            }}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            aria-busy={status === 'loading'}
            style={{
              padding: '0.875rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              background:
                status === 'loading'
                  ? '#555'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
          </button>
        </form>
      )}

      {hasFieldError && (
        <p
          id="waitlist-error"
          role="alert"
          aria-live="assertive"
          style={{
            marginTop: '0.75rem',
            marginBottom: 0,
            color: '#ef4444',
            fontSize: '0.875rem',
            textAlign: 'center',
          }}
        >
          {message}
        </p>
      )}
    </div>
  )
}
