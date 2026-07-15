-- E-3 (backlog §3.4) heartbeat/rhythm engine + E-13 notification governance.
-- agent_runs SQL exactly per the program doc §3.4, with IF NOT EXISTS guards
-- because scripts/railway-start.sh re-runs every migration on each boot
-- (prod DB has drift — never prisma migrate / db push). CREATE-only: no
-- existing table is altered.
CREATE TABLE IF NOT EXISTS agent_runs (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  kind text NOT NULL,            -- daily_brief|daily_shutdown|weekly|monthly|quarterly|annual|adhoc_nudge
  idempotency_key text NOT NULL UNIQUE,
  scheduled_for timestamptz NOT NULL,
  started_at timestamptz,
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'queued',  -- queued|running|done|failed|skipped
  output_json jsonb,
  token_cost_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_runs_user_kind_idx ON agent_runs (user_id, kind, scheduled_for DESC);

-- E-13: per-user notification governance. prefs_json = per-playbook
-- { daily_brief: { enabled, hour, channel }, daily_shutdown: { ... } }.
-- Quiet hours are local wall-clock "HH:MM"; daily_cap counts PROACTIVE
-- messages per local day; snooze_until = global "quiet week".
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id text PRIMARY KEY,
  prefs_json jsonb,
  quiet_start text NOT NULL DEFAULT '22:00',
  quiet_end text NOT NULL DEFAULT '07:30',
  daily_cap integer NOT NULL DEFAULT 3,
  snooze_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
