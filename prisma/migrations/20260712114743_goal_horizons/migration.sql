-- Time-horizon goals (wave 2, goals surface).
--
-- Additive + idempotent (safe to re-run at every container start). Adds a
-- horizon dimension so goals of different time scales (weekly … five_year)
-- live together on the `goals` table, plus an optional concrete target_date
-- used for near-term reminder/progress-vs-timeframe logic.
--
-- horizon: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'three_year' | 'five_year'
--   Existing rows default to 'yearly' (the pre-horizon goal scale).
-- target_date: nullable concrete deadline (date). Powers "days left" reminders.
ALTER TABLE goals ADD COLUMN IF NOT EXISTS horizon text NOT NULL DEFAULT 'yearly';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_date date;
-- Index the common "goals for a horizon" read path (goals page sections).
CREATE INDEX IF NOT EXISTS goals_user_horizon_idx ON goals ("userId", horizon);
