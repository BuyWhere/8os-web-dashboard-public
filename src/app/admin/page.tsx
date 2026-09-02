/**
 * /admin — owner entrypoint. The middleware already gates this route to
 * org:admin (see src/middleware.ts isAdminRoute); there was just no page
 * behind it, so even the owner landed on a 404. The real owner surface is
 * the §4.4 metrics dashboard, which additionally self-gates (404 for
 * non-owners) — so this redirect leaks nothing.
 */
import { redirect } from 'next/navigation'

export default function AdminPage() {
  redirect('/dashboard/insights')
}
