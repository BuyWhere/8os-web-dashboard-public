-- E-8 (backlog §4.3) Attribution v2: corrections + confidence + classify-once cache.
-- ADDITIVE ONLY. The startup script (scripts/railway-start.sh) re-applies every
-- migration on each boot against a drifted prod DB — never prisma migrate / db
-- push. Every statement is idempotent (ALTER ... ADD COLUMN IF NOT EXISTS /
-- CREATE INDEX IF NOT EXISTS) so re-application is a no-op.
--
--  user_override      : a human correction was made — this row is STICKY and is
--                       never re-classified by runAttribution.
--  corrected_goal_id  : the goal the user reassigned this receipt to. When
--                       user_override=true and corrected_goal_id IS NULL, the
--                       item is forced to the "unaligned" bucket.
--  confidence         : classifier self-reported confidence 0..1 (NULL for
--                       ground-truth / pre-E8 rows).
--  cache_key          : sha256 over (title-hash, attendee-domains-hash,
--                       goal-set-version). Recurring calendar/external events
--                       that share a key reuse the prior classification instead
--                       of re-paying the LLM (classify-once, product-wide).

ALTER TABLE alignment_attributions
  ADD COLUMN IF NOT EXISTS user_override boolean NOT NULL DEFAULT false;

ALTER TABLE alignment_attributions
  ADD COLUMN IF NOT EXISTS corrected_goal_id text;

ALTER TABLE alignment_attributions
  ADD COLUMN IF NOT EXISTS confidence real;

ALTER TABLE alignment_attributions
  ADD COLUMN IF NOT EXISTS cache_key text;

-- Fast reuse-lookup for the classify-once cache (recurring events).
-- NOTE: the user-scope column on this table is the UNMAPPED Prisma field
-- `userId` (quoted, camelCase) — the same convention as the existing
-- alignment_attributions_userId_sourceDate_idx — NOT a snake_case user_id.
CREATE INDEX IF NOT EXISTS alignment_attributions_user_cache_idx
  ON alignment_attributions ("userId", cache_key);
