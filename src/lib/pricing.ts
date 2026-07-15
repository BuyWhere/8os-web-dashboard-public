/**
 * Single source of truth for displayed prices. Every surface (pricing page,
 * homepage, billing, upgrade, upsells) must read from here so the shown price
 * never diverges again. IMPORTANT: these must match the amounts on the Stripe
 * Price objects that checkout charges — keep them in sync when the Stripe price
 * changes.
 */
export const PRICING = {
  proMonthly: 18,   // USD / month
  proYearly: 119,   // USD / year
  agentConnectMonthly: 9.99,
  lifeReport: 59,
} as const

/** "$18" style. */
export const fmtPrice = (n: number): string =>
  Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`

export const PRO_MONTHLY_LABEL = fmtPrice(PRICING.proMonthly) // "$18"
export const PRO_YEARLY_LABEL = fmtPrice(PRICING.proYearly)   // "$119"
