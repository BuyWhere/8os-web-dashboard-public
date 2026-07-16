'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'

interface RevealResult {
  archetypeName: string
  description: string
  element: string
  elementLabel: string
  dayMasterEn: string
  sunSignName: string
  strength: string
  phaseLabel: string | null
  phaseTeaser: string | null
}

const ELEMENT_COLORS: Record<string, string> = {
  wood: '#4FAE6F', fire: '#E8623D', earth: '#F5A623', metal: '#8C97A6', water: '#3B82B6',
}
const ELEMENT_ICONS: Record<string, string> = {
  wood: '🌱', fire: '🔥', earth: '🌍', metal: '⚙️', water: '🌊',
}

export default function RevealClient() {
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RevealResult | null>(null)
  const [copied, setCopied] = useState(false)

  // §4.4 funnel: top-of-funnel — the public pre-signup archetype taste view.
  useEffect(() => {
    try { posthog.capture('reveal_viewed') } catch {}
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!birthDate) {
      setError('Please enter your birth date.')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate, birthTime: birthTime || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Something went wrong.')
      } else {
        setResult(json as RevealResult)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function shareUrl(r: RevealResult): string {
    const base = typeof window === 'undefined' ? 'https://8os.ai' : window.location.origin
    const params = new URLSearchParams({ name: r.archetypeName, element: r.element })
    return `${base}/reveal?${params.toString()}`
  }

  async function handleCopy() {
    if (!result) return
    const url = shareUrl(result)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const color = result ? (ELEMENT_COLORS[result.element] ?? 'var(--color-accent)') : 'var(--color-accent)'

  return (
    <div style={{ maxWidth: 560, width: '100%', margin: '0 auto' }}>
      {!result && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '18px',
            padding: '2rem',
            boxShadow: 'var(--color-shadow)',
          }}
        >
          <label htmlFor="birth-date" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            Your birth date
          </label>
          <input
            id="birth-date"
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            min="1900-01-01"
            max="2100-12-31"
            required
            aria-required="true"
            aria-label="Birth date"
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              fontSize: '1rem',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: '10px',
              color: 'var(--color-text-primary)',
              marginBottom: '1.25rem',
            }}
          />

          <label htmlFor="birth-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            Birth time <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-secondary)' }}>(optional, sharpens the read)</span>
          </label>
          <input
            id="birth-time"
            type="time"
            value={birthTime}
            onChange={e => setBirthTime(e.target.value)}
            aria-label="Birth time (optional)"
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              fontSize: '1rem',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: '10px',
              color: 'var(--color-text-primary)',
              marginBottom: '1.5rem',
            }}
          />

          {error && (
            <p style={{ color: '#E8623D', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.0625rem',
              fontWeight: 700,
              background: 'var(--color-accent-gradient)',
              border: '2px solid var(--color-accent)',
              borderRadius: '12px',
              color: '#fff',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 8px 24px rgba(232, 98, 61, 0.30)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Reading your chart…' : 'Reveal my archetype →'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.85rem' }}>
            Free · no account · nothing stored
          </p>
        </form>
      )}

      {result && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          {/* Archetype card */}
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: `1px solid ${color}55`,
              borderRadius: '18px',
              padding: '2.25rem',
              textAlign: 'center',
              marginBottom: '1.25rem',
              boxShadow: 'var(--color-shadow)',
            }}
          >
            <div style={{ fontSize: '3.25rem', marginBottom: '0.75rem' }}>{ELEMENT_ICONS[result.element] ?? '🌀'}</div>
            <div style={{ fontSize: '0.72rem', color, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
              Your archetype
            </div>
            <h2 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.75rem', color: 'var(--color-text-primary)' }}>
              {result.archetypeName}
            </h2>
            <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', padding: '0.35rem 0.9rem', borderRadius: 999, border: `1px solid ${color}55`, color, fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
              {result.elementLabel} · {result.sunSignName} · {result.strength} Day Master
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>
              {result.description}
            </p>
          </div>

          {/* Current phase teaser */}
          {result.phaseTeaser && (
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '14px',
                padding: '1.35rem 1.5rem',
                marginBottom: '1.25rem',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
                Your current season {result.phaseLabel ? `· ${result.phaseLabel}` : ''}
              </div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                {result.phaseTeaser}
              </p>
            </div>
          )}

          {/* Strong CTA */}
          <Link
            href="/signup"
            style={{
              display: 'block',
              width: '100%',
              padding: '1.05rem',
              fontSize: '1.0625rem',
              fontWeight: 800,
              background: 'var(--color-accent-gradient)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              textAlign: 'center',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(232, 98, 61, 0.30)',
              marginBottom: '0.85rem',
            }}
          >
            Create your free account to build your OS →
          </Link>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem' }}>
            This is the taste. Your full OS plans goals around your seasons and times your days to your energy.
          </p>

          {/* Share + retry */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              onClick={handleCopy}
              style={{
                padding: '0.85rem 1rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                background: 'var(--color-bg-card)',
                border: `1px solid ${color}55`,
                borderRadius: '12px',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              {copied ? 'Link copied ✓' : 'Share your archetype'}
            </button>
            <button
              onClick={() => { setResult(null); setError('') }}
              style={{
                padding: '0.85rem 1rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: '12px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Try another date
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
