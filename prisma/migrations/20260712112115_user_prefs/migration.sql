-- Unified account hub — user preferences (theme + first-day-of-week).
--
-- Additive + idempotent (safe to re-run at every container start). Stores the
-- account-level theme choice and first-day-of-week on the existing
-- user_settings table (one row per user, unique userId). Timezone stays on
-- user_profiles.timezone (E-0), read via getUserTimezone().
--
-- theme: 'light' | 'dark' | 'system'  (default 'system' = follow OS pref)
-- first_day_of_week: 1 = Monday, 0 = Sunday
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'system';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS "firstDayOfWeek" integer NOT NULL DEFAULT 1;
