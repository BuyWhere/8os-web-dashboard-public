-- E-7 (backlog §5): one-tap redirection proposals — makes alignment verdicts
-- OPERABLE (principle 7: every verdict ships with its action). CREATE-only
-- with IF NOT EXISTS guards: the startup script (scripts/railway-start.sh)
-- re-applies every migration on each boot against a drifted prod DB — never
-- prisma migrate / db push. Relation-free (like external_events): the FKs are
-- logical only, Prisma mirrors columns with @map.
--
-- Lifecycle: open → accepted | declined | expired (lazy expiry >48h).
-- decline_reason ∈ busy | wrong_goal | not_now (free training signal).
-- source_kind ∈ alignment | retro | brief.
CREATE TABLE IF NOT EXISTS redirection_proposals (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  goal_id text NOT NULL,
  rationale text NOT NULL DEFAULT '',
  proposed_slot_start timestamptz NOT NULL,
  proposed_slot_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',      -- open | accepted | declined | expired
  decline_reason text,                       -- busy | wrong_goal | not_now
  source_kind text NOT NULL DEFAULT 'alignment', -- alignment | retro | brief
  source_run_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE INDEX IF NOT EXISTS redirection_proposals_user_status_idx
  ON redirection_proposals (user_id, status, created_at DESC);
