'use client'

import { useState, type FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setWarning('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Reset failed')
        return
      }

      if (data.pwnedWarning) setWarning(data.pwnedWarning)
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.logo}>8os</h1>
          <div style={styles.errorBox}>Invalid reset link. Please request a new one.</div>
          <p style={styles.footer}><Link href="/forgot-password" style={styles.link}>Request new link</Link></p>
        </div>
      </main>
    )
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.logo}>8os</h1>
        <h2 style={styles.heading}>Set new password</h2>

        {error && <div style={styles.errorBox}>{error}</div>}
        {warning && <div style={styles.warningBox}>{warning}</div>}

        {done ? (
          <div style={styles.successBox}>
            Password updated! Redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              New password
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={{ ...styles.input, paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </label>

            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        <p style={styles.footer}><Link href="/login" style={styles.link}>Back to sign in</Link></p>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>
}

const styles: Record<string, React.CSSProperties> = {
  main: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', background: '#0a0a0a' },
  card: { width: '100%', maxWidth: '400px', background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '2rem' },
  logo: { fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem', letterSpacing: '-0.03em', color: '#ededed' },
  heading: { fontSize: '1.125rem', fontWeight: '500', color: '#999', margin: '0 0 1.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: '#ccc' },
  input: { background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '0.75rem 1rem', color: '#ededed', fontSize: '1rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  eyeBtn: { position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 },
  btn: { background: '#ededed', color: '#0a0a0a', border: 'none', borderRadius: '8px', padding: '0.75rem', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', marginTop: '0.5rem' },
  errorBox: { background: '#1a0808', border: '1px solid #5c1818', color: '#ff6b6b', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '0.5rem' },
  warningBox: { background: '#1a1200', border: '1px solid #5c4400', color: '#ffc107', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '0.5rem' },
  successBox: { background: '#081a08', border: '1px solid #185c18', color: '#6bff6b', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.875rem' },
  footer: { textAlign: 'center', fontSize: '0.875rem', color: '#666', margin: '1rem 0 0' },
  link: { color: '#ededed' },
}
