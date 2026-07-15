-- OS-2651 (E-0 timezone foundation, backlog §4.1): store the user's IANA
-- timezone so daily pillar / "today" buckets / briefs stop using server time.
-- Additive + idempotent (safe to re-run at every container start).
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone text;

-- One-time backfill: existing users default to Asia/Singapore (idempotent —
-- only touches rows that still have no timezone).
UPDATE user_profiles SET timezone = 'Asia/Singapore' WHERE timezone IS NULL;
