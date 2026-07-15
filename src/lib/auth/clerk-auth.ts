import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

/**
 * Get the app user ID from Clerk authentication.
 * First tries to find user by clerkUserId, then falls back to email matching.
 * Upserts the user record if needed.
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    return null
  }

  // Try to find existing user by clerkUserId
  let user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  })

  if (user) {
    return user.id
  }

  // Fallback: try to find by email and link
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId)
    const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress

    if (primaryEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: primaryEmail },
        select: { id: true, clerkUserId: true },
      })

      if (existingUser && !existingUser.clerkUserId) {
        // Link existing user to Clerk
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: { clerkUserId },
          select: { id: true },
        })
        return user.id
      } else if (existingUser?.clerkUserId) {
        // User already linked to different Clerk account
        return existingUser.id
      }
    }

    // Create new user if no match found
    const newUser = await prisma.user.create({
      data: {
        clerkUserId,
        email: primaryEmail ?? null,
      },
    })
    return newUser.id
  } catch (error) {
    console.error('Error getting Clerk user:', error)
    // Return clerkUserId as fallback - it's a valid identifier
    return clerkUserId
  }
}

/**
 * Get the app userId or redirect to sign-in.
 * Use this in server components and API routes that require auth.
 */
export async function requireAppUserId(): Promise<string> {
  const userId = await getClerkUserId()
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}
