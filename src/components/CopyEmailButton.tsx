'use client';

import { useState } from 'react';

type CopyEmailButtonProps = {
  email: string;
};

/**
 * OS-5935: small copy-to-clipboard affordance next to each contact email.
 * Renders an icon button (📋 or ✓) that copies the address to the clipboard
 * and briefly shows a confirmation. Falls back to a text prompt if the
 * clipboard API is blocked (insecure context, browser permissions, etc.).
 */
export function CopyEmailButton({ email }: CopyEmailButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context, denied permission, etc.) —
      // surface the address in a prompt so the user can still copy manually.
      window.prompt('Copy this email address', email);
      setFailed(true);
      window.setTimeout(() => setFailed(false), 2400);
    }
  }

  const label = copied
    ? 'Copied'
    : failed
      ? 'Copy failed — select & copy'
      : 'Copy email address';

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={label}
      className="contact-copy-email-btn"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        marginLeft: '0.6rem',
        padding: '0.25rem 0.55rem',
        fontSize: '0.8rem',
        fontWeight: 500,
        lineHeight: 1.2,
        color: copied ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        background: 'transparent',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'color 120ms ease, border-color 120ms ease, background 120ms ease',
        verticalAlign: 'middle',
      }}
      onMouseEnter={(e) => {
        if (copied) return;
        e.currentTarget.style.color = 'var(--color-accent)';
        e.currentTarget.style.borderColor = 'var(--color-accent-border)';
        e.currentTarget.style.background = 'var(--color-accent-soft)';
      }}
      onMouseLeave={(e) => {
        if (copied) return;
        e.currentTarget.style.color = failed ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '0.95em' }}>
        {copied ? '✓' : '⧉'}
      </span>
      <span>{copied ? 'Copied' : failed ? 'Copy manually' : 'Copy'}</span>
    </button>
  );
}
