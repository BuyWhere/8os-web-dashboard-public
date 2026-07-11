import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db/prisma'
import { auth as clerkAuth, clerkClient } from '@clerk/nextjs/server'

/**
 * POST /api/user/delete — GDPR right-to-erasure: soft-delete the user account.
 *
 * Gate: `requireAuth` (an active Clerk session already proves identity, so the
 * legacy password re-confirmation is dropped — Clerk users have no local
 * passwordHash). Keeps the E-14 soft-delete/anonymization logic, revokes legacy
 * sessions, and deletes the Clerk user so the account is fully removed.
 */
export async function POST(req: NextRequest) {
  const authed = await requireAuth(req)
  if (authed instanceof NextResponse) return authed

  const user = await prisma.user.findUnique({ where: { id: authed.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Soft-delete: anonymize PII, mark dataDeletedAt, purge sensitive rows.
  await prisma.$transaction([
    prisma.session.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        email: null,
        phone: null,
        passwordHash: null,
        totpSecret: null,
        totpEnabled: false,
        dataDeletedAt: new Date(),
      },
    }),
    prisma.quizResponse.deleteMany({ where: { userId: user.id } }),
    prisma.otpCode.deleteMany({ where: { userId: user.id } }),
    prisma.passwordReset.deleteMany({ where: { userId: user.id } }),
    prisma.oauthAccount.deleteMany({ where: { userId: user.id } }),
  ])

  // Remove the Clerk identity too (best-effort; DB record is already erased).
  try {
    const { userId: clerkUserId } = await clerkAuth()
    if (clerkUserId) {
      const cc = await clerkClient()
      await cc.users.deleteUser(clerkUserId)
    }
  } catch (err) {
    console.error('[user/delete] Clerk user deletion failed:', err)
  }

  return NextResponse.json({ message: 'Account deleted. Sorry to see you go.' })
}
