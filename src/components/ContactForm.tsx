'use client';

import { useState } from 'react';

// Shared input/textarea styles — WCAG-AA border contrast + clear affordance
const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-accent-border)',
  borderRadius: '8px',
  color: 'var(--color-text-primary)',
  fontSize: '1rem',
  fontFamily: 'inherit',
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
  // Placeholder color: warm gray at 5.4:1 on white card bg (WCAG AA)
  // Note: :placeholder pseudo-class cannot be set inline; use the
  // contact-form class override in globals.css.
};

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  honeypot: string;
}

const INITIAL: ContactFormData = {
  name: '',
  email: '',
  subject: '',
  message: '',
  honeypot: '',
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

// OS-5736: native `name` attrs must stay on the client tree so hydration
// does not drop SSR names (QA saw name=null + method=get after hydrate).
export function ContactForm() {
  const [form, setForm] = useState<ContactFormData>(INITIAL);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const update = (k: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // basic validation
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErrorMsg('Please fill in name, email, and message.');
      setStatus('error');
      return;
    }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          honeypot: form.honeypot,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Server error: ${res.status}`);
      }
      setStatus('success');
      setForm(INITIAL);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Thanks, message received.
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          We&apos;ll get back to you within 1-2 business days. You can also reach us directly at the addresses below.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          style={{
            marginTop: '1rem',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      className="contact-form"
      method="post"
      action="/api/contact"
      onSubmit={submit}
      noValidate
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'grid',
        gap: '1rem',
      }}
    >
      <div>
        <label htmlFor="contact-name" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
          Name <span style={{ color: 'var(--color-accent)' }} aria-hidden>*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Your name"
          value={form.name}
          onChange={update('name')}
          disabled={status === 'submitting'}
          style={INPUT_STYLE}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-accent-border)'; e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.08)'; }}
        />
      </div>

      <div>
        <label htmlFor="contact-email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
          Email <span style={{ color: 'var(--color-accent)' }} aria-hidden>*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          disabled={status === 'submitting'}
          style={INPUT_STYLE}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-accent-border)'; e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.08)'; }}
        />
      </div>

      <div>
        <label htmlFor="contact-subject" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
          Subject
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          placeholder="How can we help?"
          value={form.subject}
          onChange={update('subject')}
          disabled={status === 'submitting'}
          style={INPUT_STYLE}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-accent-border)'; e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.08)'; }}
        />
      </div>

      <div>
        <label htmlFor="contact-message" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
          Message <span style={{ color: 'var(--color-accent)' }} aria-hidden>*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          placeholder="Tell us what's on your mind..."
          value={form.message}
          onChange={update('message')}
          disabled={status === 'submitting'}
          style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: '120px' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-accent-border)'; e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.08)'; }}
        />
      </div>

      {/* Honeypot for bots, hidden from sighted users — clearly non-interactive */}
      <div aria-hidden="true" role="presentation" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
        <label htmlFor="contact-honeypot">Do not fill in this field</label>
        <input
          id="contact-honeypot"
          name="honeypot"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-disabled="true"
          value={form.honeypot}
          onChange={update('honeypot')}
        />
      </div>

      {status === 'error' && errorMsg && (
        <div role="alert" style={{ color: 'var(--color-accent)', fontSize: '0.875rem' }}>
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        onFocus={e => { if (status !== 'submitting') e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-accent) 40%, transparent)'; }}
        onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
        onMouseEnter={e => { if (status !== 'submitting') e.currentTarget.style.filter = 'brightness(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
        style={{
          // Background + text colors are owned by the !important CSS rules
          // in globals.css on .contact-form button[type='submit']. The inline
          // gradient was ink-on-light-gold which failed AA on the dark half
          // (3.74:1). The CSS now paints a darker-gold gradient with white
          // text — 6.35:1+ at every pixel in both themes. OS-3982 round 2.
          background: status === 'submitting' ? 'var(--color-border)' : 'var(--color-accent)',
          color: '#FFFFFF',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: status === 'submitting' ? 'wait' : 'pointer',
          opacity: status === 'submitting' ? 0.7 : 1,
          fontFamily: 'inherit',
          transition: 'filter 0.15s ease',
        }}
      >
        {status === 'submitting' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
