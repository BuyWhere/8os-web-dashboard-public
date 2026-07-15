import { Webhook } from 'svix'
import { NextRequest, NextResponse } from 'next/server'
import { upsertUserFromClerk } from '@/lib/auth/clerk-user'
import { prisma } from '@/lib/db/prisma'
import { WebhookEvent } from '@clerk/nextjs/server'
import { captureServerEvent } from '@/lib/analytics-server'

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const payload = await req.text()
  const headerPayload = req.headers.get('svix-id')
  const headerTimestamp = req.headers.get('svix-timestamp')
  const headerSignature = req.headers.get('svix-signature')

  if (!headerPayload || !headerTimestamp || !headerSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const svix = new Webhook(WEBHOOK_SECRET)
  let event: WebhookEvent

  try {
    event = svix.verify(payload, {
      'svix-id': headerPayload,
      'svix-timestamp': headerTimestamp,
      'svix-signature': headerSignature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = event

  try {
    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const upserted = await upsertUserFromClerk({
          id: data.id,
          emailAddresses: data.email_addresses.map(e => ({
            emailAddress: e.email_address,
            verification: e.verification ? { status: e.verification.status } : undefined,
          })),
          phoneNumbers: data.phone_numbers?.map(p => ({
            phoneNumber: p.phone_number,
            verification: p.verification ? { status: p.verification.status } : undefined,
          })),
          firstName: data.first_name,
          lastName: data.last_name,
          publicMetadata: data.public_metadata as Record<string, unknown>,
        })
        console.log(`User ${type}: ${data.id}`)
        // §4.4 funnel: `signup` fires exactly once, on account creation, keyed
        // to the app userId so it joins the reveal→signup→onboarding funnel.
        if (type === 'user.created') {
          try {
            captureServerEvent(upserted.userId, 'signup', { source: 'clerk_webhook' })
          } catch {}
        }
        break
      }

      case 'user.deleted': {
        if (data.id) {
          await prisma.user.update({
            where: { clerkUserId: data.id },
            data: { dataDeletedAt: new Date() },
          }).catch(() => {
            // User might not exist, ignore
          })
          console.log(`User deleted: ${data.id}`)
        }
        break
      }

      default:
        console.log(`Unhandled webhook event type: ${type}`)
    }
  } catch (err) {
    console.error(`Error processing webhook ${type}:`, err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
