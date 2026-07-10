'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { TelegramAuthButton } from '@/components/auth/TelegramAuthButton'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Form fields
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  const isPhone = identifier.startsWith('+')

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    setError('')
    setWarning('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [isPhone ? 'phone' : 'email']: identifier,
          password,
          channel: isPhone ? 'sms' : 'email',
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Registration failed')
        return
      }

      if (data.pwnedWarning) setWarning(data.pwnedWarning)
      // Session is created server-side on registration; redirect immediately
      router.push(data.redirectTo ?? '/onboarding')
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
        <h2 style={styles.heading}>Create your account</h2>

        {error && <div style={styles.errorBox}>{error}</div>}
        {warning && <div style={styles.warningBox}>{warning}</div>}

        <form onSubmit={handleSignup} style={styles.form}>
          <label style={styles.label}>
            Email or phone number
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or +1234567890"
              required
              autoComplete="username"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Password
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <span style={styles.dividerLine} />
          </div>

          <GoogleAuthButton href="/api/auth/google?next=/onboarding" label="Continue with Google" />
          <TelegramAuthButton mode="login" next="/onboarding" />

          <p style={styles.footer}>
            Already have an account?{' '}
            <Link href="/login" style={styles.link}>Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '1rem',
    background: '#0a0a0a',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: '#111',
    border: '1px solid #222',
    borderRadius: '16px',
    padding: '2rem',
  },
  logo: {
    fontSize: '2rem',
    fontWeight: 'bold',
    margin: '0 0 0.5rem',
    letterSpacing: '-0.03em',
    color: '#ededed',
  },
  heading: {
    fontSize: '1.125rem',
    fontWeight: '500',
    color: '#999',
    margin: '0 0 1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    fontSize: '0.875rem',
    color: '#ccc',
  },
  input: {
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#ededed',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
  },
  btn: {
    background: '#ededed',
    color: '#0a0a0a',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#999',
    fontSize: '0.8rem',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#222',
  },
  dividerText: {
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  ghostBtn: {
    background: 'none',
    color: '#888',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  errorBox: {
    background: '#1a0808',
    border: '1px solid #5c1818',
    color: '#ff6b6b',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    marginBottom: '0.5rem',
  },
  warningBox: {
    background: '#1a1200',
    border: '1px solid #5c4400',
    color: '#ffc107',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    marginBottom: '0.5rem',
  },
  footer: {
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#888',
    margin: '0.5rem 0 0',
  },
  link: {
    color: '#ededed',
  },
}
