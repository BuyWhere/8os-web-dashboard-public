-- E-9 (backlog §5): mood loop & happiness-correlation insight. CREATE-only with
-- IF NOT EXISTS guards: the startup script (scripts/railway-start.sh) re-applies
-- every migration on each boot against a drifted prod DB — never prisma migrate
-- / db push. Relation-free (like external_events / redirection_proposals): the
-- user_id FK is logical only; Prisma mirrors columns with @map.
--
-- One row per (user_id, local_date) — the shutdown ritual upserts the user's
-- 1-tap mood (1-5) and energy (1-5) for their LOCAL calendar date (E-0/OS-2651
-- user-time util derives local_date). Re-logging the same day UPDATES, never
-- duplicates. source ∈ shutdown | telegram | dev_seed.
CREATE TABLE IF NOT EXISTS mood_logs (
  id         text PRIMARY KEY,
  user_id    text NOT NULL,
  local_date date NOT NULL,
  mood       smallint,
  energy     smallint,
  source     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mood_logs_user_local_date_key
  ON mood_logs (user_id, local_date);
