-- OS-2542: JournalEntry model — journal_entries table.
-- Idempotent (IF NOT EXISTS) — the startup script re-runs every migration on
-- each boot. Matches prisma/schema.prisma model JournalEntry. Conventions
-- follow assistant_conversations (text id w/ gen_random_uuid()::text default,
-- quoted camelCase columns, timestamptz + now() defaults). The FK is declared
-- inline so this migration only ever CREATEs — it never alters existing tables.
BEGIN;

CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id"        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    text NOT NULL CONSTRAINT "journal_entries_userId_fkey"
              REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "content"   text NOT NULL,
  "kind"      text NOT NULL DEFAULT 'free',
  "mood"      text,
  "entryDate" date NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "journal_entries_userId_entryDate_idx"
  ON "journal_entries"("userId", "entryDate");

COMMIT;
