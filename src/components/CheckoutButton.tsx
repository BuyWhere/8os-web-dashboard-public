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
 * OS-6536 fix: useAuth must never be called during module-level evaluation
 * (e.g. during a server-rendered import of a Client Component page).
 * Split into two files so the inner component — which is a React boundary
 * island — is never synchronously evaluated at import time.
 *
 * This wrapper calls useAuth *inside* the ClerkProvider context (it is itself
 * 'use client') so the context is always present before useAuth fires.
 */
export function CheckoutButton({ tier, label, style, className }: CheckoutButtonProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || !isSignedIn) {
    return (
      <a href={signupHref(tier)} style={style} className={className}>
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
