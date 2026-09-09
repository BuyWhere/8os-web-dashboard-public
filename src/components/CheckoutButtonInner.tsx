'use client';

import { useState } from 'react';

interface CheckoutButtonInnerProps {
  tier: 'agent-connect' | 'pro';
  label: string;
  style?: React.CSSProperties;
  className?: string;
}

function signupHref(tier: CheckoutButtonInnerProps['tier']) {
  return `/signup?plan=${encodeURIComponent(tier)}`;
}

export function CheckoutButtonInner({ tier, label, style, className }: CheckoutButtonInnerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sharedStyle: React.CSSProperties = {
    ...style,
    display: 'block',
    textAlign: 'center',
    textDecoration: 'none',
    boxSizing: 'border-box',
    width: '100%',
  };

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      if (res.status === 401) {
        window.location.href = signupHref(tier);
        return;
      }
      const data = await res.json().catch(() => ({} as { url?: string; error?: string }));
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Unable to start checkout. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className}
        style={{
          ...sharedStyle,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'Redirecting…' : label}
      </button>
      {error && (
        <p role="alert" style={{ margin: 0, fontSize: '0.78rem', color: '#f87171', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
}
