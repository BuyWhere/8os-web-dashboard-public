'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface FormData {
  name: string
  email: string
  website: string
  audienceDescription: string
  socialHandles: string
  password: string
  agreedToTerms: boolean
}

const INITIAL: FormData = {
  name: '',
  email: '',
  website: '',
  audienceDescription: '',
  socialHandles: '',
  password: '',
  agreedToTerms: false,
}

export function AffiliateForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState<FormData>(INITIAL)

  function update(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/affiliate/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          website: form.website || undefined,
          audienceDescription: form.audienceDescription || undefined,
          socialHandles: form.socialHandles || undefined,
          password: form.password || undefined,
          agreedToTerms: form.agreedToTerms,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = typeof data.error === 'string'
          ? data.error
          : data.error?.message || data.error?.email?.[0] || 'Application failed. Please try again.'
        setError(msg)
        return
      }

      setSuccess(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={styles.successBox}>
        <div style={styles.successIcon}>✓</div>
        <h3 style={styles.successTitle}>Application Received!</h3>
        <p style={styles.successText}>
          Thank you for applying to the 8os.ai Affiliate Program. We review applications within 24 hours
          and will send a confirmation to <strong>{form.email}</strong>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form} noValidate>
      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.row}>
        <Field
          label="Full Name *"
          type="text"
          value={form.name}
          onChange={(v) => update('name', v)}
          placeholder="Jane Doe"
          required
          autoComplete="name"
        />
        <Field
          label="Email Address *"
          type="email"
          value={form.email}
          onChange={(v) => update('email', v)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <Field
        label="Website / Blog URL"
        type="url"
        value={form.website}
        onChange={(v) => update('website', v)}
        placeholder="https://yourblog.com"
        autoComplete="url"
      />

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Audience Description</label>
        <textarea
          value={form.audienceDescription}
          onChange={(e) => update('audienceDescription', e.target.value)}
          placeholder="Describe your audience, e.g. astrology enthusiasts, productivity seekers, wellness coaches..."
          rows={3}
          maxLength={1000}
          style={styles.textarea}
        />
        <span style={styles.charCount}>{form.audienceDescription.length}/1000</span>
      </div>

      <Field
        label="Social Handles"
        type="text"
        value={form.socialHandles}
        onChange={(v) => update('socialHandles', v)}
        placeholder="@yourhandle on Twitter/X, @yourchannel on Instagram, etc."
        autoComplete="off"
      />

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Create a Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="Min. 8 characters (optional)"
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
        <span style={styles.hint}>Optional, create a password to manage your affiliate account</span>
      </div>

      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={form.agreedToTerms}
          onChange={(e) => update('agreedToTerms', e.target.checked)}
          required
          style={styles.checkbox}
        />
        <span>
          I agree to the{' '}
          <a href="/affiliates/terms" target="_blank" rel="noopener noreferrer" style={styles.link}>
            Affiliate Program Terms &amp; Conditions
          </a>{' '}
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        style={{
          ...styles.submitBtn,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Submitting…' : 'Apply Now, Join the 8os.ai Affiliate Program'}
      </button>
    </form>
  )
}

interface FieldProps {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  autoComplete?: string
}

function Field({ label, type, value, onChange, placeholder, required, autoComplete }: FieldProps) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        style={styles.input}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
  },
  required: {
    color: '#ef4444',
    marginLeft: '2px',
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    color: 'var(--color-text-primary)',
    fontSize: '0.9375rem',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    color: 'var(--color-text-primary)',
    fontSize: '0.9375rem',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  charCount: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    textAlign: 'right',
  },
  hint: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
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
    padding: '0.25rem',
    color: 'var(--color-text-muted)',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.625rem',
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    lineHeight: 1.5,
  },
  checkbox: {
    marginTop: '0.2rem',
    flexShrink: 0,
    accentColor: 'var(--color-accent)',
  },
  link: {
    color: 'var(--color-accent)',
    textDecoration: 'underline',
  },
  submitBtn: {
    width: '100%',
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    transition: 'opacity 0.15s, transform 0.1s',
  },
  errorBox: {
    padding: '0.75rem 1rem',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '0.875rem',
  },
  successBox: {
    textAlign: 'center',
    padding: '2.5rem 2rem',
    background: 'rgba(102,126,234,0.08)',
    border: '1px solid rgba(102,126,234,0.25)',
    borderRadius: '16px',
  },
  successIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
    color: 'var(--color-accent)',
  },
  successTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    marginBottom: '0.75rem',
  },
  successText: {
    fontSize: '0.9375rem',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
    maxWidth: '400px',
    margin: '0 auto',
  },
}
