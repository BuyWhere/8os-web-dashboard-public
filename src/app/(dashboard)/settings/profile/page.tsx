'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'

interface UserProfile {
  id: string
  email: string | null
  phone: string | null
  role: string
  emailVerified: boolean
  phoneVerified: boolean
  onboardingDone: boolean
  totpEnabled: boolean
  createdAt: string
  linkedProviders: string[]
}

interface Session {
  id: string
  deviceName: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  expiresAt: string
  current?: boolean
}

export default function ProfileSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionMsg, setSessionMsg] = useState('')

  // TOTP setup state
  const [totpStep, setTotpStep] = useState<'idle' | 'setup' | 'confirm'>('idle')
  const [totpSecret, setTotpSecret] = useState('')
  const [totpQr, setTotpQr] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpMsg, setTotpMsg] = useState('')

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteMsg, setDeleteMsg] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/user/profile').then((r) => r.json()),
      fetch('/api/user/sessions').then((r) => r.json()),
    ])
      .then(([profileData, sessionsData]) => {
        setUser(profileData.user)
        setSessions(sessionsData.sessions ?? [])
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  async function startTotpSetup() {
    setTotpMsg('')
    const res = await fetch('/api/auth/totp')
    const data = await res.json()
    if (!res.ok) {
      setTotpMsg(data.error ?? 'Failed to start 2FA setup')
      return
    }
    setTotpSecret(data.secret)
    setTotpQr(data.qrDataUrl)
    setTotpStep('setup')
  }

  async function confirmTotp(e: FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/auth/totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: totpCode }),
    })
    const data = await res.json()
    if (!res.ok) {
      setTotpMsg(data.error ?? 'Invalid code')
      return
    }
    setTotpMsg('2FA enabled successfully!')
    setTotpStep('idle')
    setUser((u) => u ? { ...u, totpEnabled: true } : u)
  }

  async function disableTotp(e: FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/auth/totp', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: totpCode }),
    })
    const data = await res.json()
    if (!res.ok) {
      setTotpMsg(data.error ?? 'Invalid code')
      return
    }
    setTotpMsg('2FA disabled.')
    setTotpStep('idle')
    setTotpCode('')
    setUser((u) => u ? { ...u, totpEnabled: false } : u)
  }

  async function revokeSession(sessionId: string) {
    setSessionMsg('')
    const res = await fetch(`/api/user/sessions?id=${sessionId}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setSessionMsg(data.error ?? 'Failed to revoke session')
      return
    }

    if (data.currentSessionRevoked) {
      router.push('/login')
      return
    }

    setSessions((ss) => ss.filter((s) => s.id !== sessionId))
    setSessionMsg(data.message ?? 'Session revoked')
  }

  async function revokeAllSessions() {
    setSessionMsg('')
    const res = await fetch('/api/user/sessions', { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setSessionMsg(data.error ?? 'Failed to revoke sessions')
      return
    }

    if (data.currentSessionRevoked) {
      router.push('/login')
    }
  }

  async function handleExport() {
    window.location.href = '/api/user/export'
  }

  async function handleDelete(e: FormEvent) {
    e.preventDefault()
    setDeleteMsg('')
    const res = await fetch('/api/user/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: deletePassword }),
    })
    const data = await res.json()
    if (!res.ok) {
      setDeleteMsg(data.error ?? 'Deletion failed')
      return
    }
    setDeleteMsg(data.message)
    setTimeout(() => router.push('/login'), 2000)
  }

  if (loading) return <main style={styles.main}><p style={{ color: '#888' }}>Loading…</p></main>
  if (error) return <main style={styles.main}><p style={{ color: '#ff6b6b' }}>{error}</p></main>
  if (!user) return null

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/dashboard" style={styles.back}>← Dashboard</Link>
          <h1 style={styles.title}>Account settings</h1>
        </div>

        {/* Profile info */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Profile</h2>
          <div style={styles.row}>
            <span style={styles.label}>Email</span>
            <span style={styles.value}>{user.email ?? '—'} {user.emailVerified ? '✓' : '(unverified)'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Phone</span>
            <span style={styles.value}>{user.phone ?? '—'} {user.phone && (user.phoneVerified ? '✓' : '(unverified)')}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Role</span>
            <span style={{ ...styles.value, textTransform: 'capitalize' }}>{user.role}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Member since</span>
            <span style={styles.value}>{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Connected accounts</h2>
          <p style={{ color: '#999', fontSize: '0.875rem', marginTop: 0 }}>
            Link Google to this account to keep phone-based onboarding and Google sign-in on the same identity.
          </p>
          <div style={styles.row}>
            <span style={styles.label}>Google</span>
            <span style={styles.value}>{user.linkedProviders.includes('google') ? 'Connected' : 'Not connected'}</span>
          </div>
          {!user.linkedProviders.includes('google') && (
            <div style={{ marginTop: '1rem' }}>
              <GoogleAuthButton href="/api/auth/google?mode=link&next=/settings/profile" label="Connect Google" />
            </div>
          )}
        </section>

        {/* 2FA / TOTP */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Two-factor authentication</h2>
          {totpMsg && <p style={{ color: user.totpEnabled ? '#6bff6b' : '#ff6b6b', fontSize: '0.875rem' }}>{totpMsg}</p>}

          {user.totpEnabled ? (
            <>
              <p style={{ color: '#999', fontSize: '0.875rem' }}>2FA is enabled on your account.</p>
              {totpStep === 'idle' && (
                <button onClick={() => setTotpStep('confirm')} style={styles.dangerBtn}>Disable 2FA</button>
              )}
              {totpStep === 'confirm' && (
                <form onSubmit={disableTotp} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    maxLength={6}
                    style={{ ...styles.input, width: '140px' }}
                  />
                  <button type="submit" style={styles.dangerBtn}>Confirm disable</button>
                  <button type="button" onClick={() => setTotpStep('idle')} style={styles.ghostBtn}>Cancel</button>
                </form>
              )}
            </>
          ) : (
            <>
              <p style={{ color: '#999', fontSize: '0.875rem' }}>Protect your account with an authenticator app.</p>
              {totpStep === 'idle' && (
                <button onClick={startTotpSetup} style={styles.btn}>Enable 2FA</button>
              )}
              {totpStep === 'setup' && (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ color: '#ccc', fontSize: '0.875rem' }}>Scan this QR code with your authenticator app:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={totpQr} alt="TOTP QR code" style={{ width: 180, height: 180, margin: '1rem 0' }} />
                  <p style={{ color: '#888', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    Manual key: <code>{totpSecret}</code>
                  </p>
                  <form onSubmit={confirmTotp} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      maxLength={6}
                      style={{ ...styles.input, width: '140px' }}
                    />
                    <button type="submit" disabled={totpCode.length !== 6} style={styles.btn}>Verify & enable</button>
                    <button type="button" onClick={() => setTotpStep('idle')} style={styles.ghostBtn}>Cancel</button>
                  </form>
                </div>
              )}
            </>
          )}
        </section>

        {/* Sessions */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Active sessions</h2>
          {sessionMsg && <p style={{ color: '#ffb86b', fontSize: '0.875rem' }}>{sessionMsg}</p>}
          {sessions.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.875rem' }}>No active sessions found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sessions.map((s) => (
                <div key={s.id} style={styles.sessionRow}>
                  <div>
                    <p style={{ margin: 0, color: '#ededed', fontSize: '0.875rem' }}>
                      {s.deviceName ?? s.userAgent?.slice(0, 60) ?? 'Unknown device'}
                      {s.current ? ' (current)' : ''}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', color: '#888', fontSize: '0.75rem' }}>
                      {s.ipAddress ?? 'IP unavailable'} · Since {new Date(s.createdAt).toLocaleDateString()} · Expires {new Date(s.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => revokeSession(s.id)} style={styles.smallDangerBtn}>
                    {s.current ? 'Sign out' : 'Revoke'}
                  </button>
                </div>
              ))}
            </div>
          )}
          <button onClick={revokeAllSessions} style={{ ...styles.dangerBtn, marginTop: '1rem' }}>
            Sign out all devices
          </button>
        </section>

        {/* Data export */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Your data</h2>
          <p style={{ color: '#999', fontSize: '0.875rem' }}>Download a copy of all data we have stored about you.</p>
          <button onClick={handleExport} style={styles.btn}>Export data (JSON)</button>
        </section>

        {/* Account deletion */}
        <section style={{ ...styles.section, borderColor: '#3d1a1a' }}>
          <h2 style={{ ...styles.sectionTitle, color: '#ff6b6b' }}>Delete account</h2>
          <p style={{ color: '#999', fontSize: '0.875rem' }}>
            Permanently remove your account and all associated data. This action cannot be undone.
          </p>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} style={styles.dangerBtn}>Delete my account</button>
          ) : (
            <form onSubmit={handleDelete} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              {deleteMsg && <p style={{ color: '#ff6b6b', fontSize: '0.875rem', margin: 0 }}>{deleteMsg}</p>}
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password to confirm"
                required
                autoComplete="current-password"
                style={styles.input}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" style={styles.dangerBtn}>Confirm deletion</button>
                <button type="button" onClick={() => setDeleteConfirm(false)} style={styles.ghostBtn}>Cancel</button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: { display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem 1rem', background: '#0a0a0a' },
  container: { width: '100%', maxWidth: '600px' },
  header: { marginBottom: '2rem' },
  back: { color: '#888', textDecoration: 'none', fontSize: '0.875rem' },
  title: { fontSize: '1.5rem', fontWeight: '700', color: '#ededed', margin: '0.5rem 0 0' },
  section: { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: '#ededed', margin: '0 0 1rem' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1a1a1a' },
  label: { color: '#888', fontSize: '0.875rem' },
  value: { color: '#ccc', fontSize: '0.875rem' },
  input: { background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '0.625rem 0.875rem', color: '#ededed', fontSize: '0.9rem', outline: 'none' },
  btn: { background: '#ededed', color: '#0a0a0a', border: 'none', borderRadius: '8px', padding: '0.625rem 1.25rem', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' },
  dangerBtn: { background: '#3d1a1a', color: '#ff6b6b', border: '1px solid #5c2020', borderRadius: '8px', padding: '0.625rem 1.25rem', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' },
  ghostBtn: { background: 'none', color: '#888', border: '1px solid #333', borderRadius: '8px', padding: '0.625rem 1rem', fontSize: '0.9rem', cursor: 'pointer' },
  sessionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #1a1a1a' },
  smallDangerBtn: { background: 'none', color: '#ff6b6b', border: '1px solid #3d1a1a', borderRadius: '6px', padding: '0.375rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' },
}
