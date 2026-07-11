-- §4.4 (backlog): daily_user_stats — the nightly rollup that powers the owner
-- metrics dashboard-of-record, the weekly insights (E-9), and keeps PostHog
-- funnel queries cheap. CREATE-only with IF NOT EXISTS guards: the startup
-- script (scripts/railway-start.sh) re-applies every migration on each boot
-- against a drifted prod DB — never prisma migrate / db push.
--
-- Relation-free (like external_events / redirection_proposals / agent_runs):
-- the user_id FK is logical only; the Prisma model mirrors columns with @map.
--
-- One row per (user_id, local_date). Written idempotently by the heartbeat
-- tick's `daily_rollup` run kind at each user's local midnight (per §4.4), which
-- aggregates from attention_ledger (tracked/passive minutes, aligned share),
-- agent_runs (rituals completed by cadence), and inbox_messages (proactive
-- sent/opened). Re-running a rollup for the same day UPSERTs — never duplicates.
CREATE TABLE IF NOT EXISTS daily_user_stats (
  user_id            text        NOT NULL,
  local_date         date        NOT NULL,
  tracked_minutes    integer     NOT NULL DEFAULT 0,  -- total ledger minutes (aligned + unaligned)
  passive_minutes    integer     NOT NULL DEFAULT 0,  -- minutes from external (calendar) signals
  aligned_share      real        NOT NULL DEFAULT 0,  -- aligned minutes / tracked minutes (0..1)
  rituals_completed  integer     NOT NULL DEFAULT 0,  -- done agent_runs (brief/shutdown/weekly/...) that local day
  proactive_sent     integer     NOT NULL DEFAULT 0,  -- inbox_messages delivered that local day
  proactive_opened   integer     NOT NULL DEFAULT 0,  -- of those, read
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, local_date)
);

CREATE INDEX IF NOT EXISTS daily_user_stats_local_date_idx
  ON daily_user_stats (local_date);
