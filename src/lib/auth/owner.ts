/**
 * src/lib/auth/owner.ts — owner gating for the §4.4 metrics dashboard-of-record.
 *
 * The owner metrics view (/dashboard/insights) must be visible ONLY to the
 * product owner. A user is the owner when EITHER:
 *   - their app-user role is 'admin', OR
 *   - their email is in OWNER_EMAILS (comma-separated env, case-insensitive).
 *
 * OWNER_EMAILS defaults to the known product owner so the gate is closed by
 * default even before the env var is set in Railway. Everyone else is a
 * non-owner and the page returns 404 (notFound) — no hint the route exists.
 */
import { prisma } from '@/lib/db/prisma'
import { auth } from '@clerk/nextjs/server'

function ownerEmails(): string[] {
  const raw = process.env.OWNER_EMAILS ?? 'richmond.teo@gmail.com'
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
}

export interface OwnerCheck {
  isOwner: boolean
  userId: string | null
  email: string | null
  role: string | null
}

/** Resolve the current Clerk user to an app user and decide owner status. */
export async function resolveOwner(): Promise<OwnerCheck> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return { isOwner: false, userId: null, email: null, role: null }

  const user = await prisma.user
    .findUnique({ where: { clerkUserId }, select: { id: true, email: true, role: true } })
    .catch(() => null)
  if (!user) return { isOwner: false, userId: null, email: null, role: null }

  const email = (user.email ?? '').toLowerCase()
  const isOwner = user.role === 'admin' || (!!email && ownerEmails().includes(email))
  return { isOwner, userId: user.id, email: user.email ?? null, role: user.role ?? null }
}
