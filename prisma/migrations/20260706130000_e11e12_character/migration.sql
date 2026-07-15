-- E-11 (backlog §5) Behavior tokens + E-12 (backlog §5) Estimation learning.
-- CREATE-only / ALTER ADD COLUMN IF NOT EXISTS, applied by scripts/railway-start.sh
-- on every boot against a drifted prod DB (never prisma migrate / db push).
-- All statements are idempotent so re-runs are no-ops.

-- ── E-11 · behavior tokens on archetype_results ─────────────────────────────
-- Deterministic token set derived from the quiz axes + Day-Master strength
-- (see src/lib/behavior-tokens.ts). Additive jsonb; NULL until populated at
-- archetype generation. A one-time backfill for existing rows follows.
ALTER TABLE archetype_results
  ADD COLUMN IF NOT EXISTS behavior_tokens jsonb;

-- Backfill existing archetype_results whose behavior_tokens is still NULL,
-- computing the SAME deterministic mapping as src/lib/behavior-tokens.ts from
-- the stored quiz axes (personality_vector) + Day-Master strength
-- (calculation_log ->> 'strength'). Idempotent: only touches NULL rows.
--   systematic  = personality_vector.systematic  (fallback 1 - intuitive, else 0.5)
--   goalDriven  = personality_vector.goalDriven  (fallback 1 - processDriven, else 0.5)
--   strong      = (calculation_log ->> 'strength') = 'strong'
-- NOTE: archetype_results uses QUOTED camelCase column names ("personalityVector",
-- "calculationLog") — Prisma mirrors these without @map. Only behavior_tokens is
-- snake_case (added with @map). The JSONB values are cast to float defensively.
UPDATE archetype_results ar
SET behavior_tokens = jsonb_build_object(
      'nudge_frequency',  CASE WHEN g >= 0.66 THEN 'high' WHEN g >= 0.4 THEN 'medium' ELSE 'low' END,
      'brief_tone',       CASE WHEN s >= 0.5 THEN 'directive' ELSE 'reflective' END,
      'task_granularity', CASE WHEN s >= 0.5 AND g >= 0.5 THEN 'fine' ELSE 'coarse' END,
      'scheduling_style', CASE WHEN strong THEN 'deep_blocks' ELSE 'varied' END,
      'challenge_level',  CASE WHEN g >= 0.5 AND strong THEN 3
                               WHEN g >= 0.5 OR strong THEN 2
                               ELSE 1 END
    )
FROM (
  SELECT id,
    COALESCE(
      NULLIF("personalityVector"->>'systematic','')::float,
      CASE WHEN "personalityVector" ? 'intuitive'
           THEN 1 - NULLIF("personalityVector"->>'intuitive','')::float END,
      0.5
    ) AS s,
    COALESCE(
      NULLIF("personalityVector"->>'goalDriven','')::float,
      CASE WHEN "personalityVector" ? 'processDriven'
           THEN 1 - NULLIF("personalityVector"->>'processDriven','')::float END,
      0.5
    ) AS g,
    (("calculationLog"->>'strength') = 'strong') AS strong
  FROM archetype_results
  WHERE behavior_tokens IS NULL
) src
WHERE ar.id = src.id AND ar.behavior_tokens IS NULL;

-- ── E-12 · per-task estimates + actuals on os_tasks ─────────────────────────
-- estimated_minutes: the agent's estimate at task creation (user-editable).
-- actual_minutes: captured at completion (focus-block duration or 1-tap).
ALTER TABLE os_tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes int;
ALTER TABLE os_tasks
  ADD COLUMN IF NOT EXISTS actual_minutes int;

-- ── E-12 · per-user per-goal-domain EMA planning-fallacy bias factor ────────
-- factor = EMA of (actual / estimated), clamped 0.5–3.0. findBestSlot pads a
-- task's estimate by this factor for its domain, and the schedule response is
-- honest about the padding ("Your <domain> tasks run 1.6x your estimates").
-- Relation-free like the other Phase C/D/E tables: user_id FK is logical only.
CREATE TABLE IF NOT EXISTS estimation_bias (
  user_id      text        NOT NULL,
  domain_id    text        NOT NULL,
  factor       real        NOT NULL DEFAULT 1.0,
  sample_count int         NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, domain_id)
);
