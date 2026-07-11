-- Stripe billing: subscriptions table.
-- Idempotent (IF NOT EXISTS): the startup script re-runs every migration on each
-- boot, and this SQL is also applied out-of-band via psql (prod DB has drift —
-- never prisma migrate / db push). CREATE-only: FK is declared inline; no
-- existing table is altered.
--
-- One row per app user (userId UNIQUE). Tracks the Pro subscription state and a
-- boolean for the one-time "Full BaZi Life Report" purchase. users.id is text
-- in prod, so userId is text here to match (same convention as the alignment
-- engine tables).
BEGIN;

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"                   text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"               text NOT NULL UNIQUE
                         CONSTRAINT "subscriptions_userId_fkey"
                         REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "stripeCustomerId"     text,
  "stripeSubscriptionId" text,
  "plan"                 text NOT NULL DEFAULT 'free',   -- 'free' | 'pro'
  "status"               text NOT NULL DEFAULT 'none',   -- 'active' | 'canceled' | 'past_due' | 'none'
  "currentPeriodEnd"     timestamptz,
  "priceId"              text,
  "lifeReportPurchased"  boolean NOT NULL DEFAULT false,
  "updatedAt"            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "subscriptions_stripeCustomerId_idx"
  ON "subscriptions" ("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "subscriptions_stripeSubscriptionId_idx"
  ON "subscriptions" ("stripeSubscriptionId");

COMMIT;
