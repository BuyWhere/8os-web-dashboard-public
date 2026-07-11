import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db/prisma'

/** GET /api/user/profile — return full user info for settings page */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      emailVerified: true,
      phoneVerified: true,
      onboardingDone: true,
      totpEnabled: true,
      createdAt: true,
      oauthAccounts: {
        select: {
          provider: true,
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    user: {
      ...user,
      linkedProviders: user.oauthAccounts.map((account: { provider: string }) => account.provider),
    },
  })
}

const updateSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/).optional(),
}).refine((d) => d.email !== undefined || d.phone !== undefined, {
  message: 'Provide at least one field to update',
})

/** PATCH /api/user/profile — update email or phone (triggers re-verification) */
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { email, phone } = parsed.data

  // Check uniqueness
  if (email) {
    const conflict = await prisma.user.findFirst({ where: { email, NOT: { id: auth.userId } } })
    if (conflict) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }
  if (phone) {
    const conflict = await prisma.user.findFirst({ where: { phone, NOT: { id: auth.userId } } })
    if (conflict) return NextResponse.json({ error: 'Phone already in use' }, { status: 409 })
  }

  const updated = await prisma.user.update({
    where: { id: auth.userId },
    data: {
      ...(email ? { email, emailVerified: false } : {}),
      ...(phone ? { phone, phoneVerified: false } : {}),
    },
    select: { id: true, email: true, phone: true, emailVerified: true, phoneVerified: true },
  })

  return NextResponse.json({ user: updated, message: 'Profile updated. Re-verification required for changed fields.' })
}
