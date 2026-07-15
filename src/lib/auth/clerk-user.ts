import { prisma } from '@/lib/db/prisma'

/**
 * Upsert a user record keyed by Clerk user ID.
 * Called on Clerk webhook (user.created, user.updated) or on first authed request.
 * Keeps the existing data model (User, UserProfile, etc.) working with Clerk auth.
 */
export async function upsertUserFromClerk(clerkUser: {
  id: string
  emailAddresses?: Array<{ emailAddress: string; verification?: { status?: string } | undefined }>
  phoneNumbers?: Array<{ phoneNumber: string; verification?: { status?: string } | undefined }>
  firstName?: string | null
  lastName?: string | null
  publicMetadata?: Record<string, unknown>
}): Promise<{ id: string; userId: string }> {
  const primaryEmail = clerkUser.emailAddresses?.find(
    (e) => e.verification?.status === 'verified' || !clerkUser.emailAddresses?.some((other) => other.verification?.status === 'verified')
  )?.emailAddress ?? clerkUser.emailAddresses?.[0]?.emailAddress ?? null

  const primaryPhone = clerkUser.phoneNumbers?.find(
    (p) => p.verification?.status === 'verified' || !clerkUser.phoneNumbers?.some((other) => other.verification?.status === 'verified')
  )?.phoneNumber ?? clerkUser.phoneNumbers?.[0]?.phoneNumber ?? null

  // Try to find existing user by clerkUserId first
  let user = await prisma.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  })

  if (!user) {
    // Try to find by email (for users who signed up with the same email before Clerk migration)
    if (primaryEmail) {
      user = await prisma.user.findUnique({
        where: { email: primaryEmail },
      })
    }

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          clerkUserId: clerkUser.id,
          email: primaryEmail,
          phone: primaryPhone,
          role: clerkUser.publicMetadata?.role as string ?? 'user',
        },
      })
    } else {
      // Link existing user to Clerk
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          clerkUserId: clerkUser.id,
          // Update email/phone if Clerk has them
          ...(primaryEmail && { email: primaryEmail }),
          ...(primaryPhone && { phone: primaryPhone }),
        },
      })
    }
  } else {
    // Update existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(primaryEmail && { email: primaryEmail }),
        ...(primaryPhone && { phone: primaryPhone }),
        ...(clerkUser.publicMetadata?.role && { role: clerkUser.publicMetadata.role as 'user' | 'premium' | 'pro' | 'admin' }),
      },
    })
  }

  return { id: user.id, userId: user.id }
}
