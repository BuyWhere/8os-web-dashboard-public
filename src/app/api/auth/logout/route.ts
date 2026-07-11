import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth/cookies'

/**
 * POST /api/auth/logout — legacy no-op under Clerk.
 *
 * Real sign-out is performed by the UI via Clerk's <SignOutButton>
 * (components/auth/SignOutButton.tsx), which ends the Clerk session and
 * redirects to /login. Nothing in the app calls this route anymore, but we keep
 * it as a harmless 200 that clears any residual legacy auth cookies so a stray
 * caller never 500s or hangs.
 */
export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ message: 'Logged out' })
  clearAuthCookies(res)
  return res
}
