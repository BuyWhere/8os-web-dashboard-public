/**
 * GET /api/products/:id
 *
 * Returns a single product by Stripe Price id.
 * Unauthenticated — public surface.
 *
 * OS-6161.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStripe, LOOKUP_KEYS, EXPECTED_AMOUNTS, PLAN_MODE, type PlanKey } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface ProductListing {
  id: string
  name: string
  description: string | null
  price: {
    amount: number
    currency: string
    interval: 'month' | 'year' | null
    lookupKey: string
  }
  mode: 'subscription' | 'payment'
  features: string[]
}

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  pro_monthly: [
    'Unlimited archetype readings',
    'Daily AI coaching',
    'Archetype skin customization',
    'Energy & commitment tracking',
    'Priority support',
  ],
  pro_yearly: [
    'Everything in Pro Monthly',
    'Save $97/year vs monthly',
    '2 months free',
    'Early access to new features',
    'Priority support',
  ],
  life_report: [
    'One-time purchase, yours forever',
    'Comprehensive 8OS archetype report',
    '36-page PDF delivered instantly',
    'Includes bazi and five elements deep-dive',
    'Lifetime updates',
  ],
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params

  try {
    const stripe = getStripe()
    const price = await stripe.prices.retrieve(id, { expand: ['product'] })

    if (!price.active) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    }

    const planKeys = Object.keys(LOOKUP_KEYS) as PlanKey[]
    const planKey = planKeys.find((k) => LOOKUP_KEYS[k] === price.lookup_key) ?? 'pro_monthly'
    const product = price.product as import('stripe').Stripe.Product | null

    const listing: ProductListing = {
      id: price.id,
      name: product?.name ?? planKey,
      description: product?.description ?? null,
      price: {
        amount: price.unit_amount ?? EXPECTED_AMOUNTS[planKey],
        currency: price.currency,
        interval: price.recurring
          ? (price.recurring.interval as 'month' | 'year')
          : null,
        lookupKey: price.lookup_key ?? planKey,
      },
      mode: PLAN_MODE[planKey],
      features: PLAN_FEATURES[planKey],
    }

    return NextResponse.json({ product: listing })
  } catch (err: unknown) {
    // Stripe throws `StripeInvalidRequestError` for unknown ids.
    if (err && typeof err === 'object' && (err as { code?: string }).code === 'resource_missing') {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/products/:id] error:', message)
    return NextResponse.json(
      { error: 'Unable to fetch product.', detail: message },
      { status: 500 },
    )
  }
}
