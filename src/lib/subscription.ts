/**
 * Subscription / plan gating helpers.
 *
 * Source of truth for a user's plan is the `subscriptions` row (upserted by the
 * Stripe webhook). getUserPlan() returns 'pro' only when there is an active (or
 * still-in-period past_due) Pro subscription; otherwise 'free'.
 *
 * NOTE: gating is intentionally soft right now — the owner is still dogfooding,
 * so no existing feature is hard-blocked. requirePro() exists so future gated
 * routes can adopt it without another migration.
 */
import { prisma } from '@/lib/db/prisma'

export type Plan = 'free' | 'pro'

export interface UserBilling {
  plan: Plan
  status: string
  currentPeriodEnd: Date | null
  lifeReportPurchased: boolean
}

/**
 * Returns 'pro' if the user has an active Pro subscription, else 'free'.
 * `past_due` still counts as pro until the period ends (Stripe dunning window).
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  const billing = await getUserBilling(userId)
  return billing.plan
}

/** Full billing snapshot for a user (safe defaults when no row exists). */
export async function getUserBilling(userId: string): Promise<UserBilling> {
  // Raw query: the `subscriptions` table is created out-of-band (CREATE-only
  // SQL, prod DB drift) and is modelled in schema.prisma, but we read it with a
  // raw query to stay resilient to prisma-client regeneration timing on deploy.
  const rows = await prisma.$queryRaw<
    Array<{
      plan: string
      status: string
      currentPeriodEnd: Date | null
      lifeReportPurchased: boolean
    }>
  >`
    SELECT "plan", "status", "currentPeriodEnd", "lifeReportPurchased"
    FROM "subscriptions"
    WHERE "userId" = ${userId}
    LIMIT 1
  `
  const row = rows[0]
  if (!row) {
    return { plan: 'free', status: 'none', currentPeriodEnd: null, lifeReportPurchased: false }
  }

  const active =
    row.plan === 'pro' &&
    (row.status === 'active' || row.status === 'past_due') &&
    (!row.currentPeriodEnd || row.currentPeriodEnd.getTime() > Date.now() - 24 * 60 * 60 * 1000)

  return {
    plan: active ? 'pro' : 'free',
    status: row.status,
    currentPeriodEnd: row.currentPeriodEnd,
    lifeReportPurchased: Boolean(row.lifeReportPurchased),
  }
}

/** Throws (for callers that want to hard-gate) if the user is not Pro. */
export async function requirePro(userId: string): Promise<void> {
  const plan = await getUserPlan(userId)
  if (plan !== 'pro') {
    const err = new Error('Pro plan required') as Error & { code?: string }
    err.code = 'PRO_REQUIRED'
    throw err
  }
}

/**
 * Upsert the subscriptions row. Called from the webhook. Uses a raw INSERT ...
 * ON CONFLICT so it works regardless of prisma model availability at runtime.
 */
export async function upsertSubscription(input: {
  userId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  plan: Plan
  status: string
  currentPeriodEnd: Date | null
  priceId: string | null
  lifeReportPurchased?: boolean
}): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "subscriptions"
      ("id", "userId", "stripeCustomerId", "stripeSubscriptionId", "plan",
       "status", "currentPeriodEnd", "priceId", "lifeReportPurchased", "updatedAt")
    VALUES
      (gen_random_uuid()::text, ${input.userId}, ${input.stripeCustomerId},
       ${input.stripeSubscriptionId}, ${input.plan}, ${input.status},
       ${input.currentPeriodEnd}, ${input.priceId},
       ${input.lifeReportPurchased ?? false}, now())
    ON CONFLICT ("userId") DO UPDATE SET
      "stripeCustomerId"     = COALESCE(EXCLUDED."stripeCustomerId", "subscriptions"."stripeCustomerId"),
      "stripeSubscriptionId" = COALESCE(EXCLUDED."stripeSubscriptionId", "subscriptions"."stripeSubscriptionId"),
      "plan"                 = EXCLUDED."plan",
      "status"               = EXCLUDED."status",
      "currentPeriodEnd"     = EXCLUDED."currentPeriodEnd",
      "priceId"              = COALESCE(EXCLUDED."priceId", "subscriptions"."priceId"),
      "lifeReportPurchased"  = "subscriptions"."lifeReportPurchased" OR EXCLUDED."lifeReportPurchased",
      "updatedAt"            = now()
  `
}

/** Mark the Life Report as purchased without touching subscription plan/status. */
export async function markLifeReportPurchased(
  userId: string,
  stripeCustomerId: string | null,
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "subscriptions"
      ("id", "userId", "stripeCustomerId", "plan", "status", "lifeReportPurchased", "updatedAt")
    VALUES
      (gen_random_uuid()::text, ${userId}, ${stripeCustomerId}, 'free', 'none', true, now())
    ON CONFLICT ("userId") DO UPDATE SET
      "lifeReportPurchased" = true,
      "stripeCustomerId"    = COALESCE(EXCLUDED."stripeCustomerId", "subscriptions"."stripeCustomerId"),
      "updatedAt"           = now()
  `
}

/**
 * Get or create the Stripe Customer id for a user and persist it. Keeps a single
 * customer per app user so subscriptions/invoices stay attached.
 */
export async function getStoredCustomerId(userId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<Array<{ stripeCustomerId: string | null }>>`
    SELECT "stripeCustomerId" FROM "subscriptions" WHERE "userId" = ${userId} LIMIT 1
  `
  return rows[0]?.stripeCustomerId ?? null
}

export async function storeCustomerId(userId: string, customerId: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "subscriptions" ("id", "userId", "stripeCustomerId", "plan", "status", "updatedAt")
    VALUES (gen_random_uuid()::text, ${userId}, ${customerId}, 'free', 'none', now())
    ON CONFLICT ("userId") DO UPDATE SET
      "stripeCustomerId" = EXCLUDED."stripeCustomerId",
      "updatedAt" = now()
  `
}
