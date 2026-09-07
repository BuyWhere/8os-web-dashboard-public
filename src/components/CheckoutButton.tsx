'use client';

interface CheckoutButtonProps {
  tier: 'agent-connect' | 'pro';
  label: string;
  style?: React.CSSProperties;
  className?: string;
}

function signupHref(tier: CheckoutButtonProps['tier']) {
  return `/signup?plan=${encodeURIComponent(tier)}`;
}

export function CheckoutButton({ tier, label, style, className }: CheckoutButtonProps) {
  // OS-6536: do not call Clerk auth hooks on the public /pricing page. Those
  // hooks throw when provider context is missing and the whole route crashes
  // into the error boundary. Marketing CTAs always go to /signup?plan=
  // (OS-5647 / OS-5891). Authenticated Stripe checkout remains on dashboard
  // upgrade surfaces.
  const sharedStyle: React.CSSProperties = {
    ...style,
    display: 'block',
    textAlign: 'center',
    textDecoration: 'none',
    boxSizing: 'border-box',
    width: '100%',
  };

  return (
    <a href={signupHref(tier)} style={sharedStyle} className={className}>
      {label}
    </a>
  );
}
