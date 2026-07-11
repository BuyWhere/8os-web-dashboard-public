import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { requireAuth } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db/prisma'

/** GET /api/auth/totp — generate TOTP secret + QR code URI */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const user = await prisma.user.findUnique({ where: { id: auth.userId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.totpEnabled) return NextResponse.json({ error: 'TOTP already enabled' }, { status: 409 })

  const secret = speakeasy.generateSecret({
    name: `8os:${user.email ?? user.phone ?? user.id}`,
    issuer: '8os',
    length: 20,
  })

  // Store pending secret (not yet confirmed)
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret.base32 },
  })

  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url!)

  return NextResponse.json({
    secret: secret.base32,
    qrDataUrl,
    otpauthUrl: secret.otpauth_url,
  })
}

const confirmSchema = z.object({ code: z.string().length(6) })

/** POST /api/auth/totp — confirm TOTP enrollment */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const user = await prisma.user.findUnique({ where: { id: auth.userId } })
  if (!user?.totpSecret) return NextResponse.json({ error: 'No pending TOTP setup' }, { status: 400 })

  const valid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: 'base32',
    token: parsed.data.code,
    window: 1,
  })

  if (!valid) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true },
  })

  return NextResponse.json({ message: '2FA enabled successfully' })
}

const disableSchema = z.object({ code: z.string().length(6) })

/** DELETE /api/auth/totp — disable TOTP */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = disableSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const user = await prisma.user.findUnique({ where: { id: auth.userId } })
  if (!user?.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
  }

  const valid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: 'base32',
    token: parsed.data.code,
    window: 1,
  })

  if (!valid) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null },
  })

  return NextResponse.json({ message: '2FA disabled' })
}
