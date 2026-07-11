/**
 * /onboarding — entry point.
 *
 * New users land here after sign-up (Clerk forceRedirectUrl) and from marketing
 * CTAs. The functional, persisting onboarding wizard begins at /onboarding/birth
 * (birth → quiz → archetype → goals → define → projects → tasks → dashboard), so
 * this route simply funnels users into it. The previous standalone all-in-one
 * screen here was a non-persisting preview mock; redirecting to /onboarding/birth
 * ensures every new user gets the real, data-backed flow.
 */
import { redirect } from 'next/navigation'

export default function OnboardingIndex() {
  redirect('/onboarding/birth')
}
