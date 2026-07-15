import { redirect } from 'next/navigation'

// De-prelaunch: 8os is LIVE. The old /coming-soon "Reserve your spot for the
// July 7, 2026 launch" page is retired. Redirect straight to /signup. A
// mirror redirect also lives in next.config.js (redirects()) so the bounce
// happens even before this route renders.
export default function ComingSoonPage() {
  redirect('/signup')
}
