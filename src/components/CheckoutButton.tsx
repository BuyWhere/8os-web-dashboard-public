'use client';

import { useState } from 'react';

interface CheckoutButtonProps {
  tier: 'agent-connect' | 'pro';
  label: string;
  style?: React.CSSProperties;
}

export function CheckoutButton({ tier, label, style }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
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
        style={{
          ...style,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? 'wait' : 'pointer',
          width: '100%',
        }}
      >
        {loading ? 'Redirecting…' : label}
      </button>
      {error && (
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#f87171', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
}
