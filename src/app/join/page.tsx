import { redirect } from 'next/navigation'

// OS-6519: /join 404s on Railway because vercel.json redirects are not
// applied to the standalone Next server. next.config already redirects
// /join → /signup, but a page-level redirect is belt-and-suspenders so
// a stale build without the next.config entry still serves waitlist UI.
export default function JoinRedirectPage() {
  redirect('/signup')
}
