import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * OS-6536: /pricing CheckoutButton must not import Clerk useAuth.
 * That hook crashes the public page when ClerkProvider context is missing.
 */
describe('CheckoutButton (OS-6536)', () => {
  const src = readFileSync(resolve(__dirname, '../CheckoutButton.tsx'), 'utf8');

  it('does not import Clerk', () => {
    expect(src).not.toMatch(/from ['"]@clerk\/nextjs['"]/);
  });

  it('links paid CTAs to /signup?plan=', () => {
    expect(src).toContain('/signup?plan=');
  });
});
