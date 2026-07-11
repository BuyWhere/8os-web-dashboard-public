/**
 * POST /api/stripe/checkout   (Clerk-authed)
 *
 * Body: { plan: 'pro_monthly' | 'pro_yearly' | 'life_report' }
 *       (also accepts legacy { tier: 'pro' | 'agent-connect' } from the
 *        marketing /pricing CheckoutButton → mapped to pro_monthly.)
 *
 * → gets/creates a Stripe Customer for the app user (stored in subscriptions),
 *   creates a Checkout Session (mode subscription for pro_*, payment for
 *   life_report) and returns { url }.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { prisma } from '@/lib/db/prisma'
import {
  getStripe,
  resolvePriceId,
  isPlanKey,
  PLAN_MODE,
  type PlanKey,
} from '@/lib/stripe'
import { getStoredCustomerId, storeCustomerId } from '@/lib/subscription'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://8os.ai'

/** Map the legacy marketing `tier` values onto canonical plan keys. */
function coercePlan(body: Record<string, unknown>): PlanKey | null {
  if (isPlanKey(body.plan)) return body.plan
  if (body.tier === 'pro') return 'pro_monthly'
  if (body.tier === 'agent-connect') return 'pro_monthly'
  return null
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  const limited = enforceRateLimit(req, RATE_LIMITS.checkout, userId)
  if (limited) return limited

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    // empty body is fine; coercePlan will 400
  }

  const plan = coercePlan(body)
  if (!plan) {
    return NextResponse.json(
      { error: 'Invalid plan. Expected pro_monthly | pro_yearly | life_report.' },
      { status: 400 },
    )
  }

  try {
    const stripe = getStripe()
    const priceId = await resolvePriceId(plan)
    const mode = PLAN_MODE[plan]

    // Resolve (or create) the Stripe Customer for this user.
    let customerId = await getStoredCustomerId(userId)
    if (!customerId) {
      // Pull the user's email for a friendlier Stripe dashboard.
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })
      const customer = await stripe.customers.create({
        email: user?.email ?? undefined,
        metadata: { appUserId: userId },
      })
      customerId = customer.id
      await storeCustomerId(userId, customerId)
    }

    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      // Do NOT set payment_method_types — let Stripe pick dynamically.
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/dashboard?upgraded=1`,
      cancel_url: `${SITE_URL}/dashboard/upgrade?canceled=1`,
      client_reference_id: userId,
      metadata: { appUserId: userId, plan },
      ...(mode === 'subscription'
        ? { subscription_data: { metadata: { appUserId: userId, plan } } }
        : { payment_intent_data: { metadata: { appUserId: userId, plan } } }),
      allow_promotion_codes: true,
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe returned no checkout URL.' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stripe/checkout] error:', message)
    return NextResponse.json({ error: 'Unable to start checkout.', detail: message }, { status: 500 })
  }
}
