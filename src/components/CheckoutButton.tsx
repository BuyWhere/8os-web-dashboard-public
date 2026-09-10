'use client';

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
 * OS-6795 r1: useAuth removed — CheckoutButtonInner already handles the 401
 * (unauthenticated) case by redirecting to /signup internally. The plain <a>
 * fallback is therefore redundant; always render CheckoutButtonInner so the
 * full loading/error states work on the marketing page.
 *
 * OS-6536 original fix intent: pricing CTAs should always link to /signup
 * for unauthenticated visitors. The CheckoutButtonInner 401 handler achieves
 * the same UX without importing @clerk/nextjs here, avoiding any risk of
 * useAuth being called outside ClerkProvider context.
 */
export function CheckoutButton({ tier, label, style, className }: CheckoutButtonProps) {
  return (
    <CheckoutButtonInner
      tier={tier}
      label={label}
      style={style}
      className={className}
    />
  );
}
