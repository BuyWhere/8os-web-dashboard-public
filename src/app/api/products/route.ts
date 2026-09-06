/**
 * GET /api/products
 *
 * Returns the canonical product catalog, resolving Stripe Price data at runtime.
 * Unauthenticated — public surface (needed for /pricing page SSR and CDN edge).
 *
 * Response shape:
 *   { products: ProductListing[] }
 *
 * OS-6161: was 404; this scaffolds the full product surface.
 * Once Railway deploy unblocks, this route becomes live at:
 *   https://api.8os.ai/api/products  → 200
 *   https://www.8os.ai/api/products → 200
 *   https://apex.8os.ai/api/products → 200
 */
import { NextResponse } from 'next/server'
import { getStripe, LOOKUP_KEYS, EXPECTED_AMOUNTS, PLAN_MODE, type PlanKey } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface ProductListing {
  id: string
  name: string
  description: string | null
  price: {
    amount: number          // cents
    currency: string
    interval: 'month' | 'year' | null   // null for one-time
    lookupKey: string
  }
  mode: 'subscription' | 'payment'
  features: string[]
}

// Static feature copy per plan — mirrors the /pricing page content.
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

/** Fetch active Stripe Prices for all known plan lookup keys and map to ProductListing. */
async function fetchCatalog(): Promise<ProductListing[]> {
  const stripe = getStripe()
  const planKeys = Object.keys(LOOKUP_KEYS) as PlanKey[]

  // Resolve price ids from stable lookup_keys and expand parent Products for
  // name/description in one request.
  const pricesRes = await stripe.prices.list({
    lookup_keys: planKeys.map((k) => LOOKUP_KEYS[k]),
    active: true,
    limit: 10,
    expand: ['data.product'],
  })

  if (!pricesRes.data.length) {
    return []
  }

  return pricesRes.data.map((price): ProductListing => {
    const planKey =
      (planKeys.find((k) => LOOKUP_KEYS[k] === price.lookup_key) ?? 'pro_monthly') as PlanKey
    const product =
      price.product && typeof price.product === 'object'
        ? (price.product as import('stripe').Stripe.Product)
        : null

    return {
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
  })
}

// Simple in-process cache — refreshed on every deploy (force-dynamic).
let _catalog: ProductListing[] | null = null

export async function GET() {
  try {
    if (!_catalog) {
      _catalog = await fetchCatalog()
    }
    return NextResponse.json({ products: _catalog })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/products] error:', message)
    return NextResponse.json(
      { error: 'Unable to fetch product catalog.', detail: message },
      { status: 500 },
    )
  }
}
