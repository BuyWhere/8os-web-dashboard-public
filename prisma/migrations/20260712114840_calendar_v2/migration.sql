-- Calendar v2 (Wave-2) — additive columns on calendar_events.
--
-- Idempotent + additive ONLY (the startup script re-runs every migration on
-- each boot; prod DB has drift — never prisma migrate / db push). No existing
-- column is dropped or retyped; 0_init is left untouched (the operator
-- consolidates these ALTERs at deploy).
--
-- NOTE: calendar_events uses quoted camelCase identifiers (0_init: "userId",
-- "startAt", "allDay"…), NOT snake_case. The new columns follow the SAME
-- convention so Prisma reads them with no @map (matching the model fields).
--
-- Adds:
--  - "goalId"             : optional link from an event to a Goal (goal-alignment
--                           in the calendar; the goals build owns the goals table,
--                           we only store the id + read goal name/domain).
--  - "location"           : free-text location on an event.
--  - "googleEventId"      : id of the mirrored event in the user's Google
--                           Calendar (two-way sync mapping; dedupe key for the
--                           read-sync so pushed events don't re-import as a copy).
--  - "googleCalendarId"   : which Google calendar the event lives on (defaults
--                           to 'primary' when pushed).
--  - "recurrenceRule"     : simple RRULE-ish token: none|daily|weekly|biweekly|monthly.
--  - "recurrenceUntil"    : optional end date for the recurrence expansion.
--  - "recurrenceParentId" : reserved — set on materialised instances split off
--                           from a recurring master (future edits-of-one).
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "goalId" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "googleCalendarId" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "recurrenceRule" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "recurrenceUntil" TIMESTAMP(3);
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "recurrenceParentId" TEXT;

-- Fast lookup when reconciling a Google push back into 8os (avoid re-import loop).
CREATE INDEX IF NOT EXISTS "calendar_events_googleEventId_idx"
  ON "calendar_events" ("userId", "googleEventId");
CREATE INDEX IF NOT EXISTS "calendar_events_goalId_idx"
  ON "calendar_events" ("goalId");
