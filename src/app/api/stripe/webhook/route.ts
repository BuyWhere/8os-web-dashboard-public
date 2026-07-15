/**
 * POST /api/stripe/webhook
 *
 * Verifies the Stripe signature (STRIPE_WEBHOOK_SECRET) against the RAW request
 * body, then upserts the subscriptions row. Handles:
 *   - checkout.session.completed        (first payment; sub or life_report)
 *   - customer.subscription.updated     (renewals, plan/status changes)
 *   - customer.subscription.deleted     (cancellation)
 *   - invoice.payment_failed            (mark past_due)
 *
 * IMPORTANT: Next.js App Router route handlers already give us the raw body via
 * req.text() (no body parser to disable, unlike the pages router). We MUST use
 * the raw string for signature verification — do not JSON.parse first.
 */
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/db/prisma'
import { getStripe } from '@/lib/stripe'
import {
  upsertSubscription,
  markLifeReportPurchased,
  type Plan,
} from '@/lib/subscription'
import { captureServerException } from '@/lib/error-track'
import { captureServerEvent } from '@/lib/analytics-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Resolve the app user id from a Stripe object. Tries metadata, then customer. */
async function resolveUserId(opts: {
  appUserId?: string | null
  clientReferenceId?: string | null
  customerId?: string | null
}): Promise<string | null> {
  const candidate = opts.appUserId || opts.clientReferenceId
  if (candidate) {
    const u = await prisma.user.findUnique({ where: { id: candidate }, select: { id: true } })
    if (u) return u.id
  }
  if (opts.customerId) {
    const rows = await prisma.$queryRaw<Array<{ userId: string }>>`
      SELECT "userId" FROM "subscriptions" WHERE "stripeCustomerId" = ${opts.customerId} LIMIT 1
    `
    if (rows[0]) return rows[0].userId
  }
  return null
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  // Stripe uses seconds; current_period_end may live at the item level in newer
  // API versions — fall back gracefully.
  const raw =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    sub.items?.data?.[0]?.current_period_end
  return typeof raw === 'number' ? new Date(raw * 1000) : null
}

function statusFromStripe(s: Stripe.Subscription.Status): string {
  if (s === 'active' || s === 'trialing') return 'active'
  if (s === 'past_due' || s === 'unpaid') return 'past_due'
  if (s === 'canceled' || s === 'incomplete_expired') return 'canceled'
  return s // incomplete, paused, etc.
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const raw = await req.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid signature'
    console.error('[stripe/webhook] signature verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
        const userId = await resolveUserId({
          appUserId: session.metadata?.appUserId,
          clientReferenceId: session.client_reference_id,
          customerId,
        })
        if (!userId) {
          console.warn('[stripe/webhook] checkout.session.completed: no user match')
          break
        }

        if (session.mode === 'payment') {
          // One-time Life Report purchase.
          await markLifeReportPurchased(userId, customerId)
        } else if (session.mode === 'subscription') {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id ?? null
          let currentPeriodEnd: Date | null = null
          let priceId: string | null = null
          let status = 'active'
          if (subId) {
            const sub = await stripe.subscriptions.retrieve(subId)
            currentPeriodEnd = periodEnd(sub)
            priceId = sub.items.data[0]?.price?.id ?? null
            status = statusFromStripe(sub.status)
          }
          await upsertSubscription({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subId,
            plan: 'pro',
            status,
            currentPeriodEnd,
            priceId,
          })
          // §4.4 funnel: `subscribed` — the terminal conversion event. Fired
          // server-side from the authoritative Stripe webhook (not the browser
          // success redirect) so it can never be lost to a closed tab.
          try {
            captureServerEvent(userId, 'subscribed', { plan: 'pro', price_id: priceId, status })
          } catch {}
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null
        const userId = await resolveUserId({
          appUserId: sub.metadata?.appUserId,
          customerId,
        })
        if (!userId) {
          console.warn('[stripe/webhook] subscription.updated: no user match')
          break
        }
        const status = statusFromStripe(sub.status)
        const plan: Plan = status === 'canceled' ? 'free' : 'pro'
        await upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          plan,
          status,
          currentPeriodEnd: periodEnd(sub),
          priceId: sub.items.data[0]?.price?.id ?? null,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null
        const userId = await resolveUserId({ appUserId: sub.metadata?.appUserId, customerId })
        if (!userId) break
        await upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          plan: 'free',
          status: 'canceled',
          currentPeriodEnd: periodEnd(sub),
          priceId: sub.items.data[0]?.price?.id ?? null,
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null
        const subId =
          typeof (invoice as unknown as { subscription?: string }).subscription === 'string'
            ? (invoice as unknown as { subscription: string }).subscription
            : null
        const userId = await resolveUserId({ customerId })
        if (!userId) break
        await upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subId,
          plan: 'pro',
          status: 'past_due',
          currentPeriodEnd: null,
          priceId: null,
        })
        break
      }

      default:
        // Ignore other events.
        break
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'handler error'
    console.error(`[stripe/webhook] handler error for ${event.type}:`, message)
    captureServerException(err, { route: '/api/stripe/webhook', extra: { eventType: event.type, eventId: event.id } })
    return NextResponse.json({ error: 'Handler error', detail: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
