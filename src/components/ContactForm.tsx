'use client'

import { FormEvent, useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SUBJECTS = [
  'General enquiry',
  'Partnership / affiliate',
  'Technical question',
  'Billing or account',
  'Bug report',
  'Feature request',
  'Other',
]

function validate(fields: {
  name: string
  email: string
  subject: string
  message: string
}): string | null {
  if (!fields.name.trim()) return 'Please enter your name.'
  if (!fields.email.trim()) return 'Please enter your email address.'
  if (!EMAIL_REGEX.test(fields.email.trim())) return 'Please enter a valid email address.'
  if (!fields.subject) return 'Please select a subject.'
  if (!fields.message.trim()) return 'Please enter a message.'
  if (fields.message.trim().length < 10) return 'Message must be at least 10 characters.'
  return null
}

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  // Honeypot
  const [website, setWebsite] = useState('')

  const hasFieldError =
    status === 'error' && statusMessage !== '' && !statusMessage.startsWith('Failed')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatusMessage('')

    // Honeypot trip
    if (website) {
      setStatus('success')
      setStatusMessage("Thanks! We'll be in touch within 1 business day.")
      return
    }

    const err = validate({ name, email, subject, message })
    if (err) {
      setStatus('error')
      setStatusMessage(err)
      return
    }

    setStatus('loading')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject,
          message: message.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}) as { error?: string })

      if (res.ok) {
        setStatus('success')
        setStatusMessage(data.message ?? "Thanks! We'll be in touch within 1 business day.")
        setName('')
        setEmail('')
        setSubject('')
        setMessage('')
      } else {
        setStatus('error')
        setStatusMessage(data.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setStatusMessage('Failed to send message. Check your connection and try again.')
    }
  }

  const fieldStyle = (hasError = false): React.CSSProperties => ({
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '0.9375rem',
    background: 'rgba(0,0,0,0.4)',
    border: hasError
      ? '1px solid #ef4444'
      : '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#ededed',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  })

  if (status === 'success') {
    return (
      <div
        style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: '12px',
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span style={{ fontWeight: 600, color: '#22c55e', fontSize: '1.0625rem' }}>
            Message sent!
          </span>
        </div>
        <p style={{ color: '#666', fontSize: '0.9375rem', margin: '0 0 1.25rem' }}>
          {statusMessage}
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#888',
            cursor: 'pointer',
            fontSize: '0.875rem',
            padding: '0.5rem 1rem',
          }}
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Contact form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
      />

      {/* Name + Email row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label
            htmlFor="contact-name"
            style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#888', marginBottom: '0.5rem' }}
          >
            Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (status === 'error') { setStatus('idle'); setStatusMessage('') }
            }}
            aria-invalid={hasFieldError && !name.trim()}
            style={fieldStyle(hasFieldError && !name.trim())}
          />
        </div>
        <div>
          <label
            htmlFor="contact-email"
            style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#888', marginBottom: '0.5rem' }}
          >
            Email <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="jane@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (status === 'error') { setStatus('idle'); setStatusMessage('') }
            }}
            aria-invalid={hasFieldError && !email.trim()}
            style={fieldStyle(hasFieldError && !email.trim())}
          />
        </div>
      </div>

      {/* Subject */}
      <div>
        <label
          htmlFor="contact-subject"
          style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#888', marginBottom: '0.5rem' }}
        >
          Subject <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <select
          id="contact-subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value)
            if (status === 'error') { setStatus('idle'); setStatusMessage('') }
          }}
          aria-invalid={hasFieldError && !subject}
          style={{
            ...fieldStyle(hasFieldError && !subject),
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            paddingRight: '2.5rem',
            cursor: 'pointer',
          }}
        >
          <option value="">Select a topic…</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="contact-message"
          style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#888', marginBottom: '0.5rem' }}
        >
          Message <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <textarea
          id="contact-message"
          rows={5}
          placeholder="Tell us what you're working on, what went wrong, or what you'd like to see…"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            if (status === 'error') { setStatus('idle'); setStatusMessage('') }
          }}
          aria-invalid={hasFieldError && !message.trim()}
          style={{ ...fieldStyle(hasFieldError && !message.trim()), resize: 'vertical', minHeight: '120px' }}
        />
      </div>

      {/* Field-level / server error */}
      {status === 'error' && (
        <p
          role="alert"
          aria-live="assertive"
          style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}
        >
          {statusMessage}
        </p>
      )}

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
          borderRadius: '10px',
          color: '#fff',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.2s',
          alignSelf: 'flex-start',
        }}
      >
        {status === 'loading' ? 'Sending…' : 'Send message →'}
      </button>

      <p style={{ color: '#555', fontSize: '0.8125rem', margin: 0 }}>
        We typically reply within 1 business day.
      </p>
    </form>
  )
}
