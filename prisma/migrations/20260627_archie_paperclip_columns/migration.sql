-- Add Paperclip multi-tenant columns to goals + clerkUserId to users.
BEGIN;

-- Users: add clerkUserId (Clerk auth integration)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerkUserId" text;
ALTER TABLE "users" ADD CONSTRAINT "users_clerkUserId_key" UNIQUE ("clerkUserId");

-- Goals: add Paperclip multi-tenant columns (already exist in prod per os-seeder raw SQL)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS "company_id" text NOT NULL DEFAULT '27f38d2c-bcdd-43c2-a022-89b0ee9ff548';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'task';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS "parent_id" uuid;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS "owner_agent_id" uuid;

COMMIT;
