import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { calculateBazi, getDayMaster } from '@/lib/bazi'
import { encrypt } from '@/lib/encryption'
import { consumeBirthRequest } from '@/lib/auth/rate-limit'

const schema = z.object({
  // ISO date string: YYYY-MM-DD
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // HH:MM or null if skipped
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  // IANA timezone e.g. "America/New_York"
  birthTimezone: z.string().nullable().optional(),
  // Gender
  gender: z.enum(['male', 'female', 'nonbinary']),
  // Location JSON: { city, country, lat, lng }
  birthLocation: z.object({
    city: z.string(),
    country: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).nullable().optional(),
  // GDPR consent
  gdprAccepted: z.boolean(),
})

export async function POST(req: NextRequest) {
  // Guard: encryption must be configured before we accept any birth data
  const encKey = process.env.ENCRYPTION_KEY
  if (!encKey || encKey.length !== 64) {
    console.error('[birth] ENCRYPTION_KEY misconfigured, length:', encKey?.length ?? 0)
    return NextResponse.json(
      { error: 'Service temporarily unavailable, encryption not configured' },
      { status: 503 },
    )
  }

  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // IP-based birth calculation rate limit: 5 per IP per hour (BaZi is CPU-heavy)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  try {
    await consumeBirthRequest(ip)
  } catch {
    return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { birthDate, birthTime, birthTimezone, gender, birthLocation, gdprAccepted } = parsed.data

  if (!gdprAccepted) {
    return NextResponse.json({ error: 'GDPR consent required' }, { status: 422 })
  }

  // Parse date
  const [year, month, day] = birthDate.split('-').map(Number)

  // Parse optional time — default noon if skipped
  let hour: number | undefined
  let minute: number | undefined
  if (birthTime) {
    const [h, m] = birthTime.split(':').map(Number)
    hour = h
    minute = m
  }

  try {
    // Full server-side BaZi calculation
    const bazi = calculateBazi(year, month, day, hour, minute)

    // Encrypt sensitive fields
    const birthDateEncrypted = encrypt(birthDate)
    const birthTimeEncrypted = birthTime ? encrypt(birthTime) : null
    const birthLocationEncrypted = birthLocation ? encrypt(JSON.stringify(birthLocation)) : null

    // Upsert UserProfile
    await prisma.userProfile.upsert({
      where: { userId: auth.userId },
      create: {
        userId: auth.userId,
        birthDateEncrypted,
        birthTimeEncrypted,
        birthTimezone: birthTimezone ?? null,
        birthLocationEncrypted,
        gender,
        dayMaster: bazi.dayMaster,
        dayElement: bazi.dayElement,
        dayPolarity: bazi.dayPolarity,
        yearPillar: bazi.pillarsText.year,
        monthPillar: bazi.pillarsText.month,
        dayPillar: bazi.pillarsText.day,
        hourPillar: bazi.pillarsText.hour,
        dominantElement: bazi.dominantElement,
        gdprAccepted: true,
        gdprAcceptedAt: new Date(),
      },
      update: {
        birthDateEncrypted,
        birthTimeEncrypted,
        birthTimezone: birthTimezone ?? null,
        birthLocationEncrypted,
        gender,
        dayMaster: bazi.dayMaster,
        dayElement: bazi.dayElement,
        dayPolarity: bazi.dayPolarity,
        yearPillar: bazi.pillarsText.year,
        monthPillar: bazi.pillarsText.month,
        dayPillar: bazi.pillarsText.day,
        hourPillar: bazi.pillarsText.hour,
        dominantElement: bazi.dominantElement,
        gdprAccepted: true,
        gdprAcceptedAt: new Date(),
      },
    })

    return NextResponse.json({
      bazi: {
        dayMaster: bazi.dayMaster,
        dayElement: bazi.dayElement,
        dayPolarity: bazi.dayPolarity,
        dominantElement: bazi.dominantElement,
        elementCounts: bazi.elementCounts,
        pillars: bazi.pillarsText,
      },
    })
  } catch (err) {
    console.error('[birth] POST error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET — client-side Day Master preview (no auth needed if just using local calc,
 * but we provide a server endpoint for consistency).
 * Query: ?year=1990&month=5&day=15
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))
  const day = Number(searchParams.get('day'))

  if (!year || !month || !day) {
    return NextResponse.json({ error: 'year, month, day required' }, { status: 400 })
  }

  const stem = getDayMaster(year, month, day)
  return NextResponse.json({ dayMaster: stem })
}
