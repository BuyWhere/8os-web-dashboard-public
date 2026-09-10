import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * OS-6536 / OS-6795 r1: CheckoutButton must not import Clerk useAuth.
 * useAuth is a client hook that requires ClerkProvider context at runtime.
 * The fix: CheckoutButtonInner handles 401 (unauthenticated) internally by
 * redirecting to /signup, so no useAuth check is needed at the wrapper level.
 */
describe('CheckoutButton (OS-6536 / OS-6795)', () => {
  const src = readFileSync(resolve(__dirname, '../CheckoutButton.tsx'), 'utf8');

  it('does not import @clerk/nextjs useAuth', () => {
    // useAuth from @clerk/nextjs must not appear — it crashes public pages
    // when ClerkProvider context is unavailable at render time.
    expect(src).not.toMatch(/from\s+['"]@clerk\/nextjs['"]/);
  });

  it('links paid CTAs to /signup?plan=', () => {
    // The signup URL pattern is used by CheckoutButtonInner's 401 handler.
    expect(src).toMatch(/\/signup\?plan=/);
  });

  it('does not call useAuth', () => {
    // Direct hook call would fail at module evaluation on public pages.
    expect(src).not.toMatch(/useAuth\s*\(/);
  });
});
