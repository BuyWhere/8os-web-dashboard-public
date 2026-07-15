/**
 * GET  /api/energy  → user's energy profile
 * PUT  /api/energy  → upsert energy profile
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { z } from 'zod'

const EnergyLevel = z.enum(['green', 'yellow', 'red'])
const Schema = z.object({
  hourMap: z.record(z.string(), EnergyLevel),
})

const DEFAULT_MAP: Record<number, 'green' | 'yellow' | 'red'> = Object.fromEntries(
  Array.from({ length: 24 }, (_, i) => {
    if (i >= 9 && i <= 11) return [i, 'green' as const]
    if (i >= 14 && i <= 16) return [i, 'green' as const]
    if ((i >= 6 && i <= 8) || (i >= 13 && i <= 17)) return [i, 'yellow' as const]
    return [i, 'red' as const]
  })
)

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const profile = await prisma.energyProfile.findUnique({ where: { userId: auth.userId } })
  return NextResponse.json({ hourMap: profile?.hourMap ?? DEFAULT_MAP })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const profile = await prisma.energyProfile.upsert({
    where: { userId: auth.userId },
    create: { userId: auth.userId, hourMap: parsed.data.hourMap },
    update: { hourMap: parsed.data.hourMap },
  })

  return NextResponse.json(profile)
}
