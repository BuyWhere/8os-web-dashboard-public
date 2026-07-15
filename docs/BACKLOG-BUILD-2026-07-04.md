# 8os — Product Backlog & Build Doc: "Passive-In, Proactive-Out"

**Version:** 2026-07-04 · **Owner:** Richmond Teo · **Status:** build-ready (companion to PRODUCT-SPEC-2026-07-03, does not supersede it)
**Purpose:** the full improvement program for 8os — the agent system, the data behind it, and the product loop — sequenced so the fleet can execute it. Every epic has a problem statement, a solution design, implementation detail, acceptance criteria, and a QA probe name.

---

## 0. How the fleet must use this doc

1. **All prod schema changes are CREATE-only raw SQL.** Never `prisma migrate` / `db push` (prod drift is real — see PRODUCT-SPEC §3). Prisma models are updated to *mirror* the SQL, then `railway up`.
2. **Deploy source is `/home/paperclip/8os/frontend` working tree**, deploy via `railway up` with the deploy-race guard. Never `git push`.
3. **Sequence any build that touches `package.json`/lockfile.** No parallel dependency-touching builds (EINTEGRITY incident).
4. **Every epic ships with its QA probe** in `/home/paperclip/8os/qa/` before it is marked done. No-Fake-Work gate applies: a probe must demonstrate the feature working with real data and demonstrate that two different users/charts get genuinely different results where relevant.
5. Epics are labeled **E-1 … E-16** and problems **P-1 … P-12**. Phases in §8 define order and dependencies.

---

## 1. Thesis

**Today:** 8os asks the user to feed it (tasks, journal, in-app calendar) so it can judge their alignment. That is the same active-maintenance contract every planner dies on.

**Target:** 8os **watches passively and steers proactively.** Real life flows in with near-zero user effort (external calendar first); the agent initiates the conversation on the user's own rhythm (daily → weekly → monthly → quarterly → annual), remembers everything durably, and every piece of guidance arrives with a one-tap action attached.

Two new non-negotiable principles, added to the five in the product spec:

6. **Passive beats ritual.** Any signal we can ingest automatically must never be requested manually. Rituals are for reflection and decision, not data entry.
7. **Every verdict ships with its action.** No advisory output without an operable next step (per principle 4, now applied to the Alignment Engine and every proactive message).

**North-star metric stays Weekly Aligned Users.** Two new input metrics:
- **RAR — Redirection Acceptance Rate:** % of redirection proposals accepted within 24h. This is the moment the product changes someone's behavior.
- **Passive Coverage:** % of attributed attention-minutes that came from external (non-manually-entered) sources. This measures how little work the user has to do for 8os to be right about their life.

---

## 2. Problem Register

| # | Problem | Root cause | Fixed by |
|---|---|---|---|
| **P-1** | Alignment Engine is signal-starved; verdicts only reflect what users manually enter | External signals deferred to v3 | E-1 (Google Calendar ingestion), E-2 (retro-alignment) |
| **P-2** | The agent has no durable memory — it re-meets the user every conversation; journal entries are a write-only dead end | No memory layer; context = archetype + live DB state only | E-5 (Life Memory), E-6 (Commitments) |
| **P-3** | The agent is purely reactive; "the agent does the work" currently means "when spoken to" | No scheduled agent execution; notifications planned as dumb reminders | E-3 (Heartbeat/Rhythm engine), E-4 (Telegram channel) |
| **P-4** | Verdicts and redirections are advisory text, not operable | Alignment v1 shipped read-only | E-7 (One-tap redirection) |
| **P-5** | No timezone model. Daily pillars, morning briefs, quiet hours, and "today" all silently assume one timezone | `UserProfile` has no `timezone`; server-time everywhere | E-0 (Timezone foundation — hard prerequisite for E-1/E-3) |
| **P-6** | Attribution has no feedback loop and unknown accuracy; at scale it has unbounded LLM cost | Classify-once cache exists but no corrections, no confidence, no model tiering | E-8 (Attribution v2: corrections + confidence + cost lanes) |
| **P-7** | Alignment can efficiently march users toward goals that make them miserable; "happiness" is unmeasured | No wellbeing signal | E-9 (Mood loop + correlation insights) |
| **P-8** | Goals are tracked but never challenged; users hold vague, overcrowded, out-of-season goals | No hygiene mechanics | E-10 (Goal hygiene + seasonal resets) |
| **P-9** | "A genuinely different OS per person" is currently mostly visual; behavior is near-identical across archetypes | OS-2122 open; no behavior token schema | E-11 (Behavior tokens) |
| **P-10** | Auto-scheduling trusts human time estimates, which are systematically wrong | No duration estimates, no learning loop | E-12 (Estimation learning) |
| **P-11** | Proactive messaging will create notification fatigue and churn if uncontrolled | No preference center, quiet hours, or caps | E-13 (Notification governance) |
| **P-12** | External data raises PII stakes beyond birth-moment encryption | No token encryption pattern for OAuth, no per-source consent, deletion path unwired | E-14 (Privacy & deletion), plus scope guidance in E-1 |

Cross-cutting ops problems (Sentry, `/tmp`, rate-limit single-instance assumption, Cal.diy stub) are handled in §7.

---
## 3. The Agent System (the deep dive)

This is the heart of the program: turning the assistant from a chat tool into a **rhythm-aware operator** that briefs, remembers, follows up, and steers on daily / weekly / monthly / quarterly / annual timescales.

### 3.1 Context assembly (every agent invocation, reactive or proactive)

Build one function of record, `assembleAgentContext(userId, runKind)`, that composes four blocks with hard token budgets. Today the prompt gets archetype + tools; this replaces that ad-hoc assembly.

| Block | Contents | Budget | Source |
|---|---|---|---|
| **Identity** | Archetype, Day Master + strength, favorable elements, behavior tokens (E-11) | ~300 tok | `ArchetypeResult`, `bazi-phases.ts` |
| **Season** | Current Luck Pillar theme, 流年, 流月, today's pillar, quarter theme, confidence labels | ~250 tok | `bazi-phases.ts` |
| **State** | Top-priority goals w/ momentum (fed/flat/starving), today's calendar, open Big-3, latest alignment verdict | ~500 tok | live DB + `get_alignment` |
| **Memory** | Top-k memory items + open commitments + last relevant journal snippet (E-5/E-6) | ~800 tok | `memory_items`, `commitments` |

Rules: blocks are assembled deterministically (same inputs → same context), each block is prefixed with an honest header (`[what 8os remembers — user-editable]`), and the memory block is *never* silently inferred from sensitive categories (health, relationships) unless the user wrote it themselves.

### 3.2 Life Memory layer (E-5)

**Problem (P-2).** The accountability-partner promise requires the agent to *know* the user across sessions. Today journal entries and conversations are stored but never distilled or recalled.

**Design.**
- New table `memory_items`: typed durable facts distilled from journal, chat, and reflections.
- **Types:** `fact` (stable truths: "works at a fintech, reports to board quarterly"), `preference` ("hates morning meetings"), `person` ("Wei Ling — cofounder"), `commitment` (promoted to `commitments`, E-6), `insight` (agent-observed pattern: "ships best in 90-min blocks"), `event` ("moving apartments in August").
- **Extraction:** nightly consolidation job per active user (cheap Flow AI lane): input = last 24h of journal entries + assistant messages + completed reflections → output = JSON list of candidate memory items with type + salience (1–5) + source pointer. Merge step: embedding-or-string similarity against existing items → update `last_confirmed_at` instead of duplicating; contradictions supersede (keep `superseded_by`).
- **Retrieval:** for context assembly, rank by `salience × recency-decay × keyword/goal relevance`, take top 12. v1 can be SQL + keyword scoring; add embeddings only if quality demands it (avoid new infra).
- **User-visible memory page** — `/dashboard/memory` ("What 8os knows about you"): list, edit, delete, pin. This is a trust feature, a correction loop, and half of the GDPR story in one page. Deleting an item hard-deletes it and flags source content as memory-excluded.

**SQL (CREATE-only):**
```sql
CREATE TABLE memory_items (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  kind text NOT NULL,              -- fact|preference|person|insight|event
  content text NOT NULL,
  salience smallint NOT NULL DEFAULT 3,
  source_kind text,                -- journal|chat|reflection|user_manual
  source_id text,
  pinned boolean NOT NULL DEFAULT false,
  superseded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_confirmed_at timestamptz NOT NULL DEFAULT now(),
  last_referenced_at timestamptz
);
CREATE INDEX memory_items_user_idx ON memory_items (user_id, kind, salience DESC);
```

**Acceptance:** two users with different journals get different memory pages; agent references a week-old journal fact unprompted in a brief; deleting a memory item removes it from the next context assembly. **Probe:** `qa/memory`.

### 3.3 Commitments (E-6)

**Problem (P-2).** The single highest-leverage accountability behavior: *remember what the user said they'd do, and follow up on the day.*

**Design.**
- Extraction runs in two places: real-time (after each assistant conversation turn, regex-cheap prefilter → LLM confirm) and in the nightly consolidation pass over journal entries. Pattern: statement of intent + explicit or inferable date ("I'll decide on the hire by Friday", "going to email the landlord tomorrow").
- `commitments` table: `text`, `due_date`, `status (open|done|renegotiated|dropped)`, `source_kind/source_id`, `goal_id` (nullable, attributed like any other item).
- **Follow-up contract:** on `due_date`, the commitment appears in that morning's brief with three operable choices: *done* / *renegotiate (pick new date)* / *drop (with one-line why, stored)*. Never guilt language; state the fact and offer the choices. Overdue-unanswered commitments appear at most twice, then auto-move to the weekly review.
- Commitments feed the attention ledger as `action` signals when completed.

**Acceptance:** writing "I'll send the deck to investors by Thursday" in the journal produces a commitment; Thursday's brief surfaces it with the three actions; each action persists. **Probe:** `qa/commitments`.

### 3.4 The Heartbeat / Rhythm engine (E-3) — the proactive core

**Problem (P-3).** All multi-timescale value (daily/weekly/monthly/annual guidance) requires scheduled, user-local-time agent execution. This is one system, built once, with per-cadence playbooks — **not** a notification feature plus a separate reports feature.

**Infrastructure.**
- New Railway **cron service** (or scheduled hit from the orchestrator) calling `POST /api/internal/heartbeat/tick` **hourly**, authenticated by HMAC header (`X-8OS-INTERNAL-SIGNATURE` over timestamp; reject >5min skew).
- `tick` selects users whose **local hour** (E-0 timezone) matches a due run window and whose `agent_runs` idempotency key doesn't exist yet, enqueues, and processes with a concurrency cap (start: 5 parallel). Idempotency key = `{userId}:{kind}:{localDate}`.
- `agent_runs` table records every run: kind, scheduled/started/finished, status, output JSON (message ids, proposals created), token cost. This is also the audit trail for cost control (§4.3).

```sql
CREATE TABLE agent_runs (
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
CREATE INDEX agent_runs_user_kind_idx ON agent_runs (user_id, kind, scheduled_for DESC);
```

**The playbooks (content contracts).** Each playbook is a function: assemble context → generate → deliver via channel layer (E-4) → record proposals. Hard rule from principle 7: every playbook output contains **exactly one primary redirection/action**, operable in one tap.

| Cadence | Trigger (user-local) | Content contract | Primary action |
|---|---|---|---|
| **Daily brief** | user-set hour, default 07:30 | Today's pillar (one line, honest confidence) → Big-3 (favorable-domain-biased) → due commitments → one alignment note | "Schedule the Big-3" or the day's redirection proposal |
| **Daily shutdown** | default 21:30 | Done/incomplete recap → carry-to-tomorrow → 1-tap mood+energy (E-9) → archetype close-line | Carry-over confirm |
| **Weekly review** | Sun evening or user-set | Alignment verdict + share-vs-priority deltas → commitment sweep → next week framed by 流月 → one shareable verdict card | Accept next week's #1 focus block |
| **Monthly (流月 transition)** | on solar-term month boundary | What the incoming month favors for *this chart* → goal-pacing adjustment ("front-load Build; hold Wealth pushes to next month") → hygiene check (E-10) | Accept re-pacing (batch reschedule via `findBestSlot`) |
| **Quarterly (12-week cycle)** | existing quarterly cycle boundary | Cycle retro (goals fed vs starving over 12 weeks) → next cycle themes paced to favorable months | Commit next cycle's 1–3 goals |
| **Annual (Lì Chūn)** | Lì Chūn ± user choice; LNY campaign window | Year pillar reading for the chart → last year's alignment story (data, not vibes) → year-ahead goal-setting ritual → **Life Report preview (first 2 pages) → $59 upsell** | Start the year-ahead ritual |

**Guardrails:** max 3 proactive messages/day (default), quiet hours 22:00–07:30 local, all governed by E-13 prefs; a failed run never retries into a duplicate message (idempotency).

**Acceptance:** two users in Singapore and New York each receive briefs at their own 07:30; re-running `tick` for the same hour is a no-op; each playbook's output contains exactly one operable action; monthly run fires on the actual solar-term boundary from `bazi-phases.ts`. **Probes:** `qa/heartbeat-idempotency`, `qa/brief-content`, `qa/monthly-transition`.

### 3.5 Channel layer: Telegram now, WhatsApp later (E-4)

**Design principle:** one `DeliveryChannel` interface (`send(userId, message, actions[])`, `parseInbound(payload)`), with drivers. Web-inbox driver (in-app messages page + toasts) and Telegram driver ship now; WhatsApp is a driver added later with zero playbook changes.

**Telegram driver (build now — this IS the notifications roadmap item, upgraded):**
- Bot via BotFather; webhook `POST /api/telegram/webhook` with Telegram's `secret_token` verification.
- **Linking:** `/dashboard/settings/channels` → deep link `t.me/<bot>?start=<signed one-time token>` → webhook validates token → store `chat_id` on the retained `OauthAccount` (provider `telegram`) — the linking rail already exists per spec §3.
- **Inbound default = universal capture:** any free text sent to the bot routes through the existing quick-capture classifier (task/goal/journal). `/brief`, `/shutdown`, `/align` commands invoke playbooks on demand. Full assistant chat over Telegram is v1.1 (same tools, same userId scoping).
- **Operable actions = inline keyboards:** every proposal renders as buttons with `callback_data` like `rp:<proposalId>:accept` → hits the same accept endpoint as the web (E-7). One tap in Telegram books the block.

**WhatsApp driver (parked, design-ready):** Meta Cloud API. Realities to plan around: business verification; business-*initiated* messages require pre-approved templates (so daily briefs = template with variables, not free-form); 24-hour customer-service window for free-form replies; per-conversation pricing. **Re-entry criteria:** Telegram-linked users >30% of WAU in SEA cohort OR clear user demand. Because of template review latency, start Meta business verification paperwork early even while the driver is parked.

**Acceptance:** link flow round-trips; unlinked users silently fall back to web inbox; a brief sent to Telegram with an accept button creates the same `CalendarEvent` as the web path; capture from Telegram creates a real task. **Probe:** `qa/telegram-brief`.

### 3.6 Coaching policy (how the agent talks)

Codify as a system-prompt module + eval rubric, not tribal knowledge:
1. **One redirection per message.** Never a list of shoulds.
2. **Receipts required.** Every claim about the user's behavior cites ledger data ("Build got 4% of your 31 tracked hours this week").
3. **Directional, never judgmental.** Banned framings: guilt, streak-shaming, "you failed."
4. **Honest confidence.** Daily pillar guidance is soft; 流月/流年 firmer; always "orientation, not prediction."
5. **Tone by behavior tokens (E-11):** directive & terse for systematic-goal types; reflective & question-led for intuitive-process types.
6. **Escalation ladder** for a starving #1 goal: week 1 nudge → week 2 explicit conversation in weekly review → week 3+ goal-hygiene confrontation (E-10). Never escalate silently past the user.

### 3.7 Agent quality evaluation (the No-Fake-Work gate for coaching)

- Build a **golden set**: 50 frozen scenarios (chart + state + memory + expected qualities), stored in `/home/paperclip/8os/qa/golden/`.
- Nightly `qa/agent-quality` probe: run each scenario through the real context assembler + playbook, score with a Flow AI judge against the rubric in 3.6 (one-action rule, receipts present, no banned framings, chart facts correct, two different charts → different guidance).
- Regression gate: score drop >10% blocks deploy of prompt/model changes. This extends the existing No-Fake-Work culture to *guidance quality*, not just feature truth.

---
## 4. The Data Behind It

### 4.1 Timezone foundation (E-0) — do this first

**Problem (P-5).** Daily transits, "today's" Big-3, brief scheduling, quiet hours, and the attention ledger's per-day buckets all need the user's local time. Nothing in the current schema stores it.

**Design:** add `timezone` (IANA string) to `UserProfile` via CREATE-only `ALTER TABLE ... ADD COLUMN` (additive = safe). Capture at onboarding from `Intl.DateTimeFormat().resolvedOptions().timeZone`, editable in settings; backfill existing users to `Asia/Singapore` with a one-time settings prompt. Every "today" computation (`bazi-phases.ts` daily pillar, ledger day-bucketing, heartbeat tick) takes an explicit tz parameter — grep for server-local `new Date()` day logic and fix. Note the doctrinal distinction: the *birth chart* uses the birth moment (already stored); the *current* daily pillar and all scheduling use current local civil time.

**Acceptance:** a New York user's daily pillar and 07:30 brief differ correctly from a Singapore user's on the same UTC instant. **Probe:** `qa/timezone`.

### 4.2 External signals: Google Calendar ingestion (E-1) — pulled forward from Alignment v3

**Problem (P-1).** The single richest passive attention signal. One OAuth scope changes the product's physics.

**Scope reality (plan around this, don't discover it later):**
- `calendar.readonly` is a Google **sensitive** scope → requires app verification (privacy policy, demo video), but **not** the expensive CASA security assessment.
- **Gmail metadata is a *restricted* scope** → requires CASA. **Defer Gmail entirely**; calendar alone carries the thesis.
- **Use a dedicated 8os Google Cloud project/OAuth client for calendar** — do *not* add sensitive scopes to the shared Flow AI client planned for SSO (§9.7 of the spec): scopes and consent-screen branding would entangle both products and both verifications. SSO can still reuse the Flow AI client as planned; calendar gets its own.
- While verification is pending, run in *testing* mode (100-user cap) — fine for the current dogfood/beta stage; submit verification immediately.

**Sync design:**
- OAuth connect flow at `/dashboard/settings/sources`; store tokens encrypted (E-14) in `external_signal_sources` (matches the spec's planned plug-in shape).
- Poll `events.list` with **incremental `syncToken`** every 30–60 min per connected user (webhook push channels are a later optimization; polling is fine at current scale and avoids channel-renewal complexity).
- Store into a separate `external_events` table — do **not** write into native `CalendarEvent` (keeps native operable data clean; external rows are read-only truth). Dedupe against native events by iCalUID + time-overlap heuristic so self-scheduled blocks aren't double-counted.
- Calendar UI renders external events as a read-only overlay layer; the scheduler's `findBestSlot` treats them as busy time (this alone improves auto-scheduling quality immediately).
- Attribution pipeline (§4.3 of the spec) consumes `external_events` identically to native items: title + attendee domains → goal attribution → attention ledger.

```sql
CREATE TABLE external_signal_sources (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  provider text NOT NULL,            -- google_calendar (first)
  encrypted_tokens text NOT NULL,
  sync_token text,
  status text NOT NULL DEFAULT 'active',  -- active|error|revoked
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE external_events (
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
CREATE INDEX external_events_user_time_idx ON external_events (user_id, starts_at);
```

**Acceptance:** connect → events appear as overlay within one poll cycle; deleting an event upstream tombstones it here; `findBestSlot` refuses a slot conflicting with an external event; attribution classifies an external "Investor pitch prep" event to the wealth goal (mirroring the spec's verified example). **Probe:** `qa/gcal-sync`.

### 4.3 Attribution v2: corrections, confidence, and cost lanes (E-8)

**Problem (P-6).** No feedback loop = unknown accuracy; naive scaling = unbounded LLM cost.

**Corrections loop:**
- Every receipt in the Alignment panel (and in briefs) becomes tappable → "reassign" sheet → pick correct goal or *unaligned*. Store on `alignment_attributions`: additive columns `user_override boolean DEFAULT false`, `corrected_goal_id text`, `confidence real`.
- Nightly attribution includes the user's 10 most recent corrections as few-shot examples (personal calibration, cheap and effective).
- **Metric:** correction rate (< 10% target). It is the attribution accuracy gauge — instrument it in PostHog from day one.

**Cost engineering (this is a Flow AI synergy — you own the router):**
- Define **lanes** in Flow AI routing and pass a lane header from 8os: `attribution` → cheapest capable model; `chat` → mid; `advisor`/`report`/`agent-quality-judge` → premium. One config, product-wide cost control.
- Batch: attribution runs in the nightly window (spread over hours), classify-once cache extended to external events by `(title-hash, attendee-domains-hash, goal-set-version)` — recurring meetings classify once, not daily. Expect cache hit rates >60% on calendar data (recurring meetings dominate).
- **Per-user daily token budget** recorded via `agent_runs.token_cost_json`; on breach, degrade gracefully (skip adhoc nudges first, never skip the daily brief). Envelope math at 1k users: ~15 new items/user/day × 40% cache miss ≈ 6k cheap-lane classifications/day — trivial through Flow AI; the budget exists to catch pathological loops, not normal use.

**Acceptance:** a correction visibly re-scores the verdict on next run; the same recurring meeting is classified exactly once across 7 days; lane headers observable in Flow AI logs. **Probe:** `qa/attribution-feedback`.

### 4.4 Analytics & metrics (extends OS-2134)

PostHog event taxonomy to wire (exact names, so funnels are stable): `reveal_viewed`, `signup`, `onboarding_birth`, `onboarding_quiz`, `onboarding_archetype_viewed`, `onboarding_goals_set`, `gcal_connected`, `retro_verdict_viewed`, `retro_card_shared`, `brief_delivered`, `brief_opened`, `redirection_proposed`, `redirection_accepted`, `shutdown_completed`, `mood_logged`, `weekly_review_completed`, `commitment_created`, `commitment_closed`, `memory_edited`, `upgrade_viewed`, `subscribed`.

Nightly rollup table `daily_user_stats` (CREATE-only) aggregating: tracked minutes, passive minutes, aligned share, rituals completed, proactive messages sent/opened. Powers the weekly insights (E-9), the admin view, and keeps PostHog queries cheap.

**Dashboard of record (owner view):** WAU-aligned, RAR, Passive Coverage, correction rate, ritual completion by cadence, Telegram-linked %, funnel conversion by step.

---

## 5. Product Epics (the rest of the backlog)

### E-2 · Retro-alignment onboarding ("the aha")
After goals are set in onboarding (or from an upsell card on the dashboard for existing users): prompt calendar connect → backfill **60 days** of events → batch-attribute on the cheap lane with a progress UI (stream results in; don't block) → render **"Your last 30 days"**: attention-share vs stated priorities, the starving #1 goal, top unaligned sink, one redirection — plus a shareable verdict card (second share loop beside the OG archetype card, same OG-image pipeline). Free (it is the activation moment); the 60-day deep version + "year ahead" framing is Pro/Life-Report surface. Cap backfill attribution at ~1,500 events/user. **Acceptance:** a fresh user with a connected calendar sees a data-true retro verdict in <3 minutes; two different users' cards differ. **Probe:** `qa/retro-alignment`.

### E-7 · One-tap redirection (operable verdicts)
New model `redirection_proposals` (`user_id, goal_id, rationale, proposed_slot_start/end, status open|accepted|declined|expired, source_run_id`). Generation: alignment verdict computes the starving-goal redirection → calls `findBestSlot` → persists proposal. Delivery: dashboard Alignment panel, daily brief, Telegram inline button — all hitting `POST /api/redirections/:id/accept`, which creates the goal-linked `CalendarEvent` with focus-block defense, marks accepted, and emits `redirection_accepted`. Declines ask a one-tap reason (`busy|wrong goal|not now`) — free training signal. Proposals expire in 48h. **Acceptance:** accept from Telegram and from web both create the identical event; RAR visible in PostHog. **Probe:** `qa/redirection`.

### E-9 · Mood loop & happiness correlation
Shutdown gains two 1-tap scales (mood 1–5, energy 1–5) — total added friction ≈ 2 seconds; also loggable via Telegram shutdown. Table `mood_logs (user_id, local_date, mood, energy, source, UNIQUE(user_id, local_date))`. Weekly review includes a correlation insight **only when n ≥ 10 logs** and correlation is non-trivial (|r| ≥ 0.3 on weekly aggregates vs per-domain attention share): "In weeks where Health got >20% of your time, your energy averaged +0.8." Language guardrails: observational, never causal, never prescriptive about mental health; if mood trends persistently low, the agent softens goal-push language (behavior-token override) rather than commenting on the mood itself. This closes the loop your mission statement promises — *value and happiness*, with the user's own data validating what actually feeds them. **Acceptance:** insights suppressed below threshold; two users with different ledgers get different insights. **Probe:** `qa/mood`.

### E-10 · Goal hygiene & seasonal resets
Starvation detector: goal with priority rank ≤ 2 receiving <5% attention share for 21 consecutive days → weekly review confrontation with exactly three operable outcomes: **recommit** (auto-proposes a recurring block), **shrink** (agent drafts a smaller version), **retire** (archived + a one-line "goal funeral" reflection stored to journal/memory — retiring is framed as a win of focus, not a failure). **Active-goal cap of 3** ("Focus Mode", default-on, overridable in settings — product philosophy, not a paywall). Seasonal reset: the annual Lì Chūn playbook (§3.4) is the sanctioned moment for goal turnover; LNY marketing points at it. **Acceptance:** detector fires on synthetic starving data; retire writes the reflection; cap blocks a 4th active goal with the override path working. **Probe:** `qa/goal-hygiene`.

### E-11 · Behavior tokens (makes OS-2122 concrete)
A deterministic function from existing archetype dimensions — quiz axes (systematic/intuitive × goal/process) + Day Master strength — to a stored token set on `ArchetypeResult`:
```
behavior_tokens = {
  nudge_frequency: low|medium|high,      // process-oriented → lower
  brief_tone: directive|reflective,      // systematic → directive
  task_granularity: fine|coarse,         // systematic-goal → fine
  scheduling_style: deep_blocks|varied,  // strong Day Master → deep_blocks
  challenge_level: 1|2|3                 // goal-oriented + strong → 3
}
```
Consumed by: coaching prompts (§3.6), scheduler defaults (block length 90 vs 45), project-gen task depth, notification governor (E-13), ritual copy. **This ships before the 12 skins** — behavior is the "genuinely different OS," skins are paint. No-Fake-Work check built into the probe: two archetypes differing on any input axis must produce at least one differing token *and* observably different scheduling/brief output. **Probe:** `qa/behavior-tokens`.

### E-12 · Estimation learning ("the reality factor")
Additive column `os_tasks.estimated_minutes` (agent estimates at creation; user-editable). Actuals from focus-block durations or a one-tap prompt at completion. Per-user, per-goal-domain EMA bias factor (actual/estimated, clamped 0.5–3.0) stored in `daily_user_stats` rollups; `findBestSlot` multiplies estimates by the factor and adds transition buffer. The agent is honest about it: "Your Build tasks run 1.6× your estimates — I've padded today's block." Nobody in either competitor category does personalized planning-fallacy correction; it compounds the "it actually knows me" feeling with zero mysticism. **Probe:** `qa/estimation`.

### E-13 · Notification governance
`notification_prefs` per user: per-playbook enable + hour + channel, quiet hours (default 22:00–07:30 local), global daily cap (default 3 proactive), one-tap global snooze ("quiet week" — e.g., travel). Governor sits in the channel layer so every driver obeys it. Later (not now): adaptive frequency — downshift `nudge_frequency` automatically when opens drop for 2 weeks. **Probe:** `qa/notification-governance` (asserts quiet hours and caps hold across drivers).

### E-14 · Privacy, consent & deletion
Reuse the existing birth-moment AES encryption util for OAuth tokens. Per-source consent copy at connect time stating exactly what is read (event titles/times/attendees), where it is processed (Flow AI, on-account), and retention (external_events rolling 180 days). Wire the full deletion path: revoke Google token → cascade delete `external_signal_sources`, `external_events`, derived `alignment_attributions`, `memory_items`, `mood_logs` → confirmation. Publish the policy page; this is also a Google-verification prerequisite, so it gates E-1's public launch. **Probe:** `qa/deletion-path`.

---

## 6. Monetization adjustments (deltas to spec §5)

| Surface | Free | Pro |
|---|---|---|
| Daily brief | Lite (Big-3 only, web inbox) | Full (verdict line, commitments, redirection, Telegram) |
| Retro-alignment | 30-day verdict + share card (activation — keep free) | 60-day deep report; "year-ahead" framing feeds Life Report |
| Calendar sync | Connect + overlay | Attribution + verdicts on external data |
| Mood insights | Log only | Weekly correlations |
| One-tap redirection | 1/week teaser | Unlimited |

The annual **Lì Chūn playbook is the Life Report's native sales moment**: the run auto-generates the report's first two pages from the user's real chart + real last-year ledger, then offers the $59 full report. This converts the report from a marketing SKU into a ritual outcome. **Agent Connect ($29/mo API): formally deprioritized** — moved to §9 with re-entry criteria; remove it from year-1 revenue mix assumptions (replan mix ≈ 70% Pro / 30% reports).

---

## 7. Ops, security & cleanup (do alongside Phase A)

1. **Kill Cal.diy.** Standardize on native `CalendarEvent` (fully works today per spec §2), delete the 501 stub, retire the service. External calendars now arrive via E-1, which removes Cal.diy's remaining rationale. One less service on the droplet.
2. **`sudo chmod 1777 /tmp`** (owner action) — unblocks the QA harness crashes; keep `TMPDIR=/home/paperclip/.pwtmp` as belt-and-braces.
3. **Sentry** (roadmap item 10) before the heartbeat ships — proactive messaging failures are silent by nature; they must page.
4. **Rate limiting:** current in-memory sliding window assumes a single instance — acceptable now; add the new endpoints (`/api/telegram/webhook`, `/api/internal/heartbeat/tick`, `/api/redirections/*`) to it, and note a Postgres-backed limiter as the future multi-instance path (no Redis; don't add infra).
5. **Webhook secrets:** Telegram `secret_token`, heartbeat HMAC, plus the pending `CLERK_WEBHOOK_SECRET` — land all three in the same pass.
6. Remove `bcryptjs`, dedupe `/blog` vs `/blog-new` — DONE 2026-07-04. ⚠️ CORRECTION: the Python `os-generator` is NOT dead — it is the PRIMARY onboarding seeder (`os-seeder.ts` → `/generate` + `/generate-tasks`, called from `/api/onboarding/archetype`). DO NOT DELETE. Rescinded until seeding is made fully in-process TS.

---

## 8. Sequenced build plan

Dependencies flow downward. Weeks are agent-fleet estimates; parallelize only within a phase, and never parallelize dependency-touching builds.

| Phase | Weeks | Contents | Exit criteria |
|---|---|---|---|
| **A — Foundations** | 1–2 | E-0 timezone · channel-layer interface + web-inbox driver · E-4 Telegram link/capture/commands · §7 ops batch (Cal.diy kill, Sentry, /tmp, secrets) · all Phase-A SQL migrations in one reviewed CREATE-only script | `qa/timezone` + `qa/telegram-brief` green; Sentry receiving |
| **B — Passive-In** | 2–4 | E-1 Google Calendar (dedicated OAuth client, testing mode; submit verification immediately) · scheduler busy-time integration · E-2 retro-alignment + share card · E-14 consent/deletion (gates public E-1) | `qa/gcal-sync` + `qa/retro-alignment` + `qa/deletion-path` green; `retro_verdict_viewed` firing |
| **C — Proactive-Out** | 3–5 | E-3 heartbeat infra + daily brief & shutdown playbooks · E-7 one-tap redirection (web + Telegram) · E-13 governance · analytics taxonomy (§4.4) | `qa/heartbeat-idempotency` + `qa/redirection` green; RAR measurable |
| **D — Agent Depth** | 5–7 | E-5 memory layer + `/dashboard/memory` · E-6 commitments · E-8 attribution corrections + lanes · E-9 mood loop | `qa/memory` + `qa/commitments` + `qa/attribution-feedback` green; golden-set harness (§3.7) live |
| **E — Rhythm & Character** | 7–9 | Weekly/monthly/quarterly/annual playbooks · E-10 goal hygiene · E-11 behavior tokens · E-12 estimation learning · Lì Chūn → Life Report flow | `qa/agent-quality` gate enforced in deploys; all cadences observed firing on real boundaries |
| **F — Later** | 9+ | 12 Sun-sign skins (after behavior tokens) · WhatsApp driver (re-entry criteria §3.5) · adaptive notification frequency · synastry UI · i18n zh | — |

Existing roadmap items absorbed: notifications → Phase C (as the heartbeat); Alignment v2 goal-discovery → E-5/E-6 (memory/commitments are the sharper version); OS-2122 → E-11; OS-2134 → §4.4; Cal.diy decision → §7.1; SSO/Stripe-live/Clerk-webhook remain owner-gated as specced (Stripe live keys become urgent at Phase C exit, when Pro gating starts mattering).

---

## 9. Parked (explicitly, with re-entry criteria)

| Item | Why parked | Re-enters when |
|---|---|---|
| **Agent Connect / developer API** | Pre-PMF distraction serving a tertiary persona; inference economics no longer force it (Flow AI exists). Owner-confirmed 2026-07-04. | Weekly Aligned Users retention proven (W4 ritual retention >20%) AND ≥3 credible inbound integration requests |
| **Gmail metadata ingestion** | Restricted scope → CASA assessment cost/time | Calendar-only Passive Coverage plateaus below 50% and users ask for it |
| **WhatsApp driver** | Meta verification + template review + per-conversation cost | §3.5 criteria; start business verification paperwork early regardless |
| **NetEase/DingTalk/WeCom/Feishu** | Enterprise-gated (as specced) | practitioner/white-label tier work begins |
| **Embeddings for memory retrieval** | Avoid infra until keyword retrieval demonstrably fails | `qa/memory` relevance failures |

---

## 10. Open decisions for Rich (owner-gated)

1. **Google Cloud:** approve creating the dedicated 8os OAuth project for `calendar.readonly` (recommendation: yes — do not entangle the shared Flow AI client; SSO still reuses Flow AI's clients as planned).
2. **Telegram bot identity:** name/handle (suggest `@eight_os_bot` or similar; needed before Phase A).
3. **Brief defaults:** confirm 07:30 / 21:30 local as global defaults.
4. **Free-tier redirection teaser:** confirm 1/week (vs 0) — recommendation: 1/week; the accept moment is the best upgrade ad the product has.
5. **Backfill window:** 60 days (recommended) vs 90 — cost is linear, wow-factor plateaus.
6. **Sentry vs lightweight alternative** — recommendation: Sentry, free tier is enough.
7. `sudo chmod 1777 /tmp` on the droplet (blocks QA reliability today).

---

**Compressed thesis, restated:** the moat is not the archetype, and not even the phase engine — it is the closed loop: *passive truth in → chart-aware, memory-backed judgment → one-tap change out → measured again tomorrow.* Everything in this doc either widens the intake, deepens the judgment, or shortens the loop.
