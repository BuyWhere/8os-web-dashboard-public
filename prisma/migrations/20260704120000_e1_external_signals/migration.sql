-- E-1 (backlog §4.2): external-signal ingestion — external_signal_sources +
-- external_events. SQL exactly per the program doc, with IF NOT EXISTS guards
-- because the startup script re-runs every migration on each boot (prod DB has
-- drift — never prisma migrate / db push). CREATE-only: no existing table is
-- altered. Column names are snake_case per the doc; Prisma mirrors them with
-- @map (relation-free models, like VisionItem).
--
-- encrypted_tokens holds the AES-256-GCM ciphertext of the OAuth token JSON
-- (same ENCRYPTION_KEY util as birth-moment data — E-14). external_events is
-- read-only external truth: never written into native calendar_events.
CREATE TABLE IF NOT EXISTS external_signal_sources (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  provider text NOT NULL,            -- google_calendar (first)
  encrypted_tokens text NOT NULL,
  sync_token text,
  status text NOT NULL DEFAULT 'active',  -- active|error|revoked
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_events (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  source_id text NOT NULL,
  external_id text NOT NULL,
  ical_uid text,
  title text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  attendees_json jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);

CREATE INDEX IF NOT EXISTS external_events_user_time_idx ON external_events (user_id, starts_at);
