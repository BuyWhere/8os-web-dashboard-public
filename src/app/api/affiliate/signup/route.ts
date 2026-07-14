import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { createAffiliateCode } from '@/lib/affiliate/service'

const signupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  website: z.string().trim().max(500).optional(),
  audienceDescription: z.string().trim().max(1000).optional(),
  socialHandles: z.string().trim().max(500).optional(),
  password: z.string().min(8).max(128).optional(),
  agreedToTerms: z.boolean().refine((v) => v === true, {
    message: 'You must agree to the terms and conditions',
  }),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { name, email, website, audienceDescription, socialHandles } = parsed.data

  // Check for existing affiliate
  const existing = await prisma.affiliate.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: 'An affiliate with this email already exists' },
      { status: 409 },
    )
  }

  // Determine default commission (use higher tier for now — per spec, Agent Connect = 25%)
  // In v2 this can be made configurable via URL params or tier selection
  const defaultCommissionBps = 2500 // 25%, Agent Connect tier default

  const affiliateCode = await createAffiliateCode(name)

  const affiliate = await prisma.affiliate.create({
    data: {
      email,
      name,
      code: affiliateCode,
      status: 'active',
      defaultCommissionBps,
    },
  })

  // TODO (OS-1080): Create user account with password if provided
  // TODO (OS-1080): Trigger Stripe Connect onboarding email

  return NextResponse.json(
    {
      success: true,
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        code: affiliate.code,
      },
      message: 'Application received. You will receive a confirmation email shortly.',
    },
    { status: 201 },
  )
}
