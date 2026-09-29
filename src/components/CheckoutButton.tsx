'use client';

import { useAuth } from '@clerk/nextjs';
import { CheckoutButtonInner } from './CheckoutButtonInner';

interface CheckoutButtonProps {
  tier: 'agent-connect' | 'pro';
  label: string;
  style?: React.CSSProperties;
  className?: string;
}

function signupHref(tier: CheckoutButtonProps['tier']) {
  return `/signup?plan=${encodeURIComponent(tier)}`;
}

/**
 * Unauthenticated (and Clerk-not-yet-loaded) visitors get a direct <a> link.
 * Never POST /api/stripe/checkout unauthenticated — that 401s and looks like
 * a dead CTA. Fixes OS-6383 (pricing CTAs missing plan= params for logged-out users).
 */
export function CheckoutButton({ tier, label, style, className }: CheckoutButtonProps) {
  const { isLoaded, isSignedIn } = useAuth();

  const sharedStyle: React.CSSProperties = {
    ...style,
    display: 'block',
    textAlign: 'center',
    textDecoration: 'none',
    boxSizing: 'border-box',
    width: '100%',
  };

  // Logged-out (and Clerk-not-yet-loaded) visitors get a real <a href="/signup?plan=...">.
  if (!isLoaded || !isSignedIn) {
    return (
      <a href={signupHref(tier)} style={sharedStyle} className={className}>
        {label}
      </a>
    );
  }

  return (
    <CheckoutButtonInner
      tier={tier}
      label={label}
      style={style}
      className={className}
    />
  );
}
