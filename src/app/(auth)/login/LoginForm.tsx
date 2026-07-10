'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { TelegramAuthButton } from '@/components/auth/TelegramAuthButton'

interface LoginFormProps {
  googleAuthEnabled: boolean
}

export function LoginForm({ googleAuthEnabled }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const oauthError = searchParams.get('error')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(oauthError ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Login failed')
        return
      }

      router.push(data.redirectTo ?? next)
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
        <h2 style={styles.heading}>Welcome back</h2>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
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
                placeholder="Your password"
                required
                autoComplete="current-password"
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
            <Link href="/forgot-password" style={{ ...styles.link, fontSize: '0.8rem', alignSelf: 'flex-end' }}>
              Forgot password?
            </Link>
          </label>

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <span style={styles.dividerLine} />
          </div>

          {googleAuthEnabled && (
            <GoogleAuthButton href={`/api/auth/google?next=${encodeURIComponent(next)}`} label="Continue with Google" />
          )}
          <TelegramAuthButton mode="login" next={next} />

          <p style={styles.footer}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={styles.link}>Create one</Link>
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
  errorBox: {
    background: '#1a0808',
    border: '1px solid #5c1818',
    color: '#ff6b6b',
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
