-- Align goalId columns to goals.id type (uuid) and add the three missing FKs.
--
-- Background: prisma.schema declares Goal.id as String (text) and child goalId
-- columns as String too, but `goals.id` was migrated out-of-band to native uuid.
-- The startup-time 0_init migration declared TEXT→TEXT FKs which Postgres
-- silently skipped (the "FOREIGN KEY constraint cannot be implemented" error
-- path), leaving os_projects_goalId_fkey / os_tasks_goalId_fkey /
-- activity_logs_goalId_fkey absent. Assistant tool writes (e.g. add a goal /
-- project / task) hit this when executeTool calls Prisma → 500.
--
-- All three child columns are empty in prod (0 rows), so the ALTER is a no-op
-- on data. Goals already store valid uuid strings, so ::uuid cast succeeds.
--
-- After this migration:
--   * os_projects.goalId, os_tasks.goalId, activity_logs.goalId are uuid
--   * The three FKs are present and match the @relation onDelete in schema.prisma
--   * prisma/schema.prisma needs @db.Uuid on these three goalId columns to keep
--     future prisma generate/deploy from recreating the drift.

BEGIN;

-- Idempotent: only run the ALTER if column is still text.
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'os_projects' AND column_name = 'goalId') = 'text' THEN
    ALTER TABLE "os_projects"
      ALTER COLUMN "goalId" TYPE uuid USING "goalId"::uuid;
  END IF;

  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'os_tasks' AND column_name = 'goalId') = 'text' THEN
    ALTER TABLE "os_tasks"
      ALTER COLUMN "goalId" TYPE uuid USING "goalId"::uuid;
  END IF;

  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'activity_logs' AND column_name = 'goalId') = 'text' THEN
    ALTER TABLE "activity_logs"
      ALTER COLUMN "goalId" TYPE uuid USING "goalId"::uuid;
  END IF;
END$$;

-- Add the missing FKs (idempotent via NOT EXISTS guard).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'os_projects_goalId_fkey'
  ) THEN
    ALTER TABLE "os_projects"
      ADD CONSTRAINT "os_projects_goalId_fkey"
      FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'os_tasks_goalId_fkey'
  ) THEN
    ALTER TABLE "os_tasks"
      ADD CONSTRAINT "os_tasks_goalId_fkey"
      FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_logs_goalId_fkey'
  ) THEN
    ALTER TABLE "activity_logs"
      ADD CONSTRAINT "activity_logs_goalId_fkey"
      FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

COMMIT;