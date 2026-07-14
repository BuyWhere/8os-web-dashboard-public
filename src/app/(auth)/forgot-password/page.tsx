'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong')
        return
      }

      setSent(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.logo}>8os</h1>
        <h2 style={styles.heading}>Reset your password</h2>

        {error && <div style={styles.errorBox}>{error}</div>}

        {sent ? (
          <div style={styles.successBox}>
            <p style={{ margin: 0 }}>
              If an account exists for <strong>{email}</strong>, you&apos;ll receive a reset link shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                style={styles.input}
              />
            </label>

            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p style={styles.footer}>
          <Link href="/login" style={styles.link}>Back to sign in</Link>
        </p>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', background: '#F7F3EC' },
  card: { width: '100%', maxWidth: '400px', background: '#FFFFFF', border: '1px solid #E7DFD2', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 24px rgba(34,31,26,0.06)' },
  logo: { fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem', letterSpacing: '-0.03em', color: '#221F1A' },
  heading: { fontSize: '1.125rem', fontWeight: '500', color: '#6B6257', margin: '0 0 1.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: '#221F1A' },
  input: { background: '#FFFFFF', border: '1px solid #E7DFD2', borderRadius: '8px', padding: '0.75rem 1rem', color: '#221F1A', fontSize: '1rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btn: { background: '#B08637', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '0.75rem', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', marginTop: '0.5rem' },
  errorBox: { background: '#FFF5F5', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '0.5rem' },
  successBox: { background: '#F0FDF4', border: '1px solid #86EFAC', color: '#15803D', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '0.5rem' },
  footer: { textAlign: 'center', fontSize: '0.875rem', color: '#6B6257', margin: '1rem 0 0' },
  link: { color: '#B08637' },
}
