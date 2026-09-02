'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

interface CheckoutButtonProps {
  tier: 'agent-connect' | 'pro';
  label: string;
  style?: React.CSSProperties;
}

function signupHref(tier: CheckoutButtonProps['tier']) {
  return `/signup?plan=${encodeURIComponent(tier)}`;
}

export function CheckoutButton({ tier, label, style }: CheckoutButtonProps) {
  const { isLoaded, isSignedIn } = useAuth();
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

  // Logged-out (and Clerk-not-yet-loaded) visitors get a real <a href="/signup">.
  // Never POST /api/stripe/checkout unauthenticated — that 401s and looks like a dead CTA (OS-5647).
  if (!isLoaded || !isSignedIn) {
    return (
      <a href={signupHref(tier)} style={sharedStyle}>
        {label}
      </a>
    );
  }

  async function handleClick() {
    setLoading(true);
    setError(null);

    // Logged-out visitors should never hit checkout — skip the 401 round-trip
    // and keep the selected tier on the signup URL (OS-5891).
    if (isLoaded && !isSignedIn) {
      window.location.href = signupHref(tier);
      return;
    }

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
