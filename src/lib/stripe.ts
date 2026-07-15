/**
 * Stripe server client + shared price/plan config for 8os billing.
 *
 * Test-mode only for now (sk_test_… key in Railway env). The `stripe` client is
 * lazily instantiated so importing this module in a build/SSR context that lacks
 * the secret key (e.g. static marketing pages) does not throw at import time.
 *
 * Price IDs are resolved by stable `lookup_key` at runtime (see resolvePriceId)
 * so we never hardcode `price_…` ids. The Products/Prices are created once,
 * idempotently, by scripts/stripe-setup.js.
 */
import Stripe from 'stripe'

let _stripe: Stripe | null = null

/** Get the singleton Stripe client. Throws only when actually used without a key. */
export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  _stripe = new Stripe(key, {
    // Pin the API version for reproducible behaviour.
    apiVersion: '2025-08-27.basil',
    appInfo: { name: '8os', url: 'https://8os.ai' },
  })
  return _stripe
}

/** The three purchasable plans, keyed by the value the checkout API accepts. */
export type PlanKey = 'pro_monthly' | 'pro_yearly' | 'life_report'

/** Stable Stripe lookup_keys — one per Price. Never changes. */
export const LOOKUP_KEYS: Record<PlanKey, string> = {
  pro_monthly: 'pro_monthly',
  pro_yearly: 'pro_yearly',
  life_report: 'life_report',
}

/** Expected unit amounts (cents) — used by the QA probe and as a sanity guard. */
export const EXPECTED_AMOUNTS: Record<PlanKey, number> = {
  pro_monthly: 1800, // $18 / mo
  pro_yearly: 11900, // $119 / yr
  life_report: 5900, // $59 one-time
}

/** Which plans are recurring subscriptions vs one-time payments. */
export const PLAN_MODE: Record<PlanKey, 'subscription' | 'payment'> = {
  pro_monthly: 'subscription',
  pro_yearly: 'subscription',
  life_report: 'payment',
}

/**
 * Resolve a Stripe Price id from its stable lookup_key. Cached in-process.
 * We look prices up by lookup_key rather than storing raw price ids so the
 * integration is portable across Stripe accounts / test-vs-live.
 */
const _priceCache = new Map<PlanKey, string>()

export async function resolvePriceId(plan: PlanKey): Promise<string> {
  const cached = _priceCache.get(plan)
  if (cached) return cached
  const stripe = getStripe()
  const res = await stripe.prices.list({
    lookup_keys: [LOOKUP_KEYS[plan]],
    active: true,
    limit: 1,
  })
  const price = res.data[0]
  if (!price) {
    throw new Error(
      `No active Stripe Price found for lookup_key="${LOOKUP_KEYS[plan]}". Run scripts/stripe-setup.js.`,
    )
  }
  _priceCache.set(plan, price.id)
  return price.id
}

export function isPlanKey(v: unknown): v is PlanKey {
  return v === 'pro_monthly' || v === 'pro_yearly' || v === 'life_report'
}
