-- OS-2542 step 2: Alignment Engine — goal_rankings + alignment_attributions +
-- attention_ledger. Idempotent (IF NOT EXISTS): the startup script re-runs every
-- migration on each boot, and this SQL is also applied out-of-band via psql
-- (prod DB has drift — never prisma migrate / db push). CREATE-only: FKs are
-- declared inline; no existing table is altered.
--
-- attention_ledger design note: one row per (user, goal-or-unaligned, day).
-- "goalId" IS NULL is the *unaligned* bucket (attention pointed at no goal).
-- SQL UNIQUE treats NULLs as distinct, so uniqueness is enforced with TWO
-- partial unique indexes instead of a composite PK: one over (userId, goalId,
-- day) for goal rows, one over (userId, day) for the single unaligned row.
-- The engine rebuilds the window with DELETE+INSERT inside a transaction, so
-- it never needs ON CONFLICT upserts against these indexes.
BEGIN;

-- NB: goals.id is uuid in prod (out-of-band table), users.id is text — the
-- goalId columns below are uuid to match (same drift os_tasks."goalId" has;
-- Prisma models them as String and that works in prod).
CREATE TABLE IF NOT EXISTS "goal_rankings" (
  "userId"    text NOT NULL CONSTRAINT "goal_rankings_userId_fkey"
              REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "goalId"    uuid NOT NULL CONSTRAINT "goal_rankings_goalId_fkey"
              REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "rank"      integer NOT NULL,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "goal_rankings_pkey" PRIMARY KEY ("userId", "goalId")
);

CREATE TABLE IF NOT EXISTS "alignment_attributions" (
  "id"         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     text NOT NULL CONSTRAINT "alignment_attributions_userId_fkey"
               REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sourceType" text NOT NULL, -- 'calendar' | 'task' | 'journal' | 'chat'
  "sourceId"   text NOT NULL,
  "sourceDate" date NOT NULL,
  "goalId"     uuid CONSTRAINT "alignment_attributions_goalId_fkey"
               REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "weight"     text NOT NULL DEFAULT 'unrelated', -- 'direct' | 'supporting' | 'unrelated' | 'counter'
  "minutes"    integer NOT NULL DEFAULT 0,
  "rationale"  text NOT NULL DEFAULT '',
  "createdAt"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "alignment_attributions_sourceType_sourceId_key" UNIQUE ("sourceType", "sourceId")
);

CREATE INDEX IF NOT EXISTS "alignment_attributions_userId_sourceDate_idx"
  ON "alignment_attributions"("userId", "sourceDate");

CREATE TABLE IF NOT EXISTS "attention_ledger" (
  "id"        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    text NOT NULL CONSTRAINT "attention_ledger_userId_fkey"
              REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "goalId"    uuid CONSTRAINT "attention_ledger_goalId_fkey"
              REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE, -- NULL = unaligned bucket
  "day"       date NOT NULL,
  "minutes"   integer NOT NULL DEFAULT 0,
  "actions"   integer NOT NULL DEFAULT 0,
  "mentions"  integer NOT NULL DEFAULT 0,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "attention_ledger_user_goal_day_key"
  ON "attention_ledger"("userId", "goalId", "day") WHERE "goalId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "attention_ledger_user_unaligned_day_key"
  ON "attention_ledger"("userId", "day") WHERE "goalId" IS NULL;
CREATE INDEX IF NOT EXISTS "attention_ledger_userId_day_idx"
  ON "attention_ledger"("userId", "day");

COMMIT;
