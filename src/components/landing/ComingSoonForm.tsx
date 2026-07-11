'use client'

import { FormEvent, useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface ComingSoonFormProps {
  // The /coming-soon page is the canonical prelaunch URL. Other 8os.ai
  // surfaces (homepage hero, /how-it-works, /pricing, /quiz) embed this
  // same form via cross-link OR by mounting the component with a different
  // `source` so channel attribution stays accurate.
  source?: string
  ctaLabel?: string
  archetype?: string
}

export default function ComingSoonForm({
  source = 'coming-soon',
  ctaLabel = 'Reserve my spot',
  archetype,
}: ComingSoonFormProps) {
  const [email, setEmail] = useState('')
  const [affiliateOptIn, setAffiliateOptIn] = useState(true)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [position, setPosition] = useState<number | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
          affiliate_opt_in: affiliateOptIn,
          ...(archetype ? { archetype } : {}),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setPosition(data.position)
        setMessage(`You're in. We'll email you when your spot opens.`)
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setMessage('Failed to join waitlist')
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '2rem',
    backdropFilter: 'blur(10px)',
    textAlign: 'left',
  }

  if (status === 'success') {
    return (
      <div
        data-testid="coming-soon-success"
        style={{
          ...cardStyle,
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        }}
      >
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            color: '#22c55e',
          }}
        >
          You're on the list.
        </h2>
        <p style={{ color: '#a3a3a3', marginBottom: '0.5rem', lineHeight: 1.5 }}>
          {message}
        </p>
        {position !== null && (
          <p style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.95rem' }}>
            You're #{position} in line.
          </p>
        )}
        {affiliateOptIn && (
          <p
            style={{
              marginTop: '1.25rem',
              padding: '0.875rem 1rem',
              background: 'rgba(118, 75, 162, 0.1)',
              border: '1px solid rgba(118, 75, 162, 0.3)',
              borderRadius: '8px',
              color: '#c4b5fd',
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}
          >
            <strong>Affiliate program:</strong> we've added you to the recruitment list. We'll reach
            out before launch with onboarding details.
          </p>
        )}
      </div>
    )
  }

  return (
    <div data-testid="coming-soon-form" style={cardStyle}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label
            htmlFor="coming-soon-email"
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#a3a3a3',
              marginBottom: '0.5rem',
            }}
          >
            Email
          </label>
          <input
            id="coming-soon-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              fontSize: '1rem',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '0.875rem 1rem',
            background: 'rgba(118, 75, 162, 0.06)',
            border: '1px solid rgba(118, 75, 162, 0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={affiliateOptIn}
            onChange={(e) => setAffiliateOptIn(e.target.checked)}
            style={{
              marginTop: '0.15rem',
              width: '1.1rem',
              height: '1.1rem',
              accentColor: '#764ba2',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '0.9rem', color: '#d4d4d4', lineHeight: 1.5 }}>
            <strong style={{ color: '#fff' }}>Join the affiliate program.</strong> Earn 30% recurring
            on Pro/Agent Connect referrals. Pre-launch partners get founding-affiliate rates.
          </span>
        </label>

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '1rem 1.5rem',
            fontSize: '1.05rem',
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
          {status === 'loading' ? 'Reserving…' : ctaLabel}
        </button>
      </form>

      {status === 'error' && (
        <p
          role="alert"
          style={{
            marginTop: '1rem',
            color: '#ef4444',
            fontSize: '0.875rem',
          }}
        >
          {message}
        </p>
      )}
    </div>
  )
}
