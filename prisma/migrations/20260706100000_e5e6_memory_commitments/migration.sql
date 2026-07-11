-- E-5 (backlog §3.2) Life Memory layer + E-6 (backlog §3.3) Commitments.
-- CREATE-only with IF NOT EXISTS guards: the startup script
-- (scripts/railway-start.sh) re-applies every migration on each boot against a
-- drifted prod DB — never prisma migrate / db push. Relation-free (like
-- external_events / redirection_proposals): the FKs are logical only, Prisma
-- mirrors columns with @map.
--
-- memory_items: typed durable facts distilled nightly from journal/chat/
-- reflections (+ user-manual adds). kind ∈ fact|preference|person|insight|event.
-- salience 1–5 (default 3). Merge updates last_confirmed_at instead of
-- duplicating; contradictions set superseded_by. Deleting hard-deletes (the
-- user-visible correction/GDPR surface at /dashboard/memory).
CREATE TABLE IF NOT EXISTS memory_items (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  kind text NOT NULL,                    -- fact|preference|person|insight|event
  content text NOT NULL,
  salience smallint NOT NULL DEFAULT 3,
  source_kind text,                      -- journal|chat|reflection|user_manual
  source_id text,
  pinned boolean NOT NULL DEFAULT false,
  superseded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_confirmed_at timestamptz NOT NULL DEFAULT now(),
  last_referenced_at timestamptz
);

CREATE INDEX IF NOT EXISTS memory_items_user_idx
  ON memory_items (user_id, kind, salience DESC);

-- commitments: what the user said they'd do, so the agent can follow up ON the
-- day. status ∈ open|done|renegotiated|dropped. due_date nullable (a
-- commitment with no inferable date stays open until re-surfaced). goal_id
-- nullable (attributed like any other item — feeding the ledger is DEFERRED to
-- E-8). drop_reason stores the one-line why.
CREATE TABLE IF NOT EXISTS commitments (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  content text NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'open',   -- open|done|renegotiated|dropped
  source_kind text,                      -- journal|chat|reflection|user_manual
  source_id text,
  goal_id text,
  drop_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commitments_user_status_due_idx
  ON commitments (user_id, status, due_date);
