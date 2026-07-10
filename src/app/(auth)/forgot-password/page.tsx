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
  main: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', background: '#0a0a0a' },
  card: { width: '100%', maxWidth: '400px', background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '2rem' },
  logo: { fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem', letterSpacing: '-0.03em', color: '#ededed' },
  heading: { fontSize: '1.125rem', fontWeight: '500', color: '#999', margin: '0 0 1.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: '#ccc' },
  input: { background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '0.75rem 1rem', color: '#ededed', fontSize: '1rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btn: { background: '#ededed', color: '#0a0a0a', border: 'none', borderRadius: '8px', padding: '0.75rem', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', marginTop: '0.5rem' },
  errorBox: { background: '#1a0808', border: '1px solid #5c1818', color: '#ff6b6b', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '0.5rem' },
  successBox: { background: '#081a08', border: '1px solid #185c18', color: '#6bff6b', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '0.5rem' },
  footer: { textAlign: 'center', fontSize: '0.875rem', color: '#888', margin: '1rem 0 0' },
  link: { color: '#ededed' },
}
