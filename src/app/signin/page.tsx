import { redirect } from 'next/navigation'

// OS-2618: /signin is a legacy Clerk path. The app uses /login. This page is a
// defense-in-depth server redirect layered under the next.config + middleware
// redirects, so /signin never 404s.
export default function SignInRedirectPage() {
  redirect('/login')
}
