# 8OS — CURRENT PRODUCT SPEC (as-built)

**Reconciled:** 2026-06-30 | **Live:** https://8os.ai | **Source of truth:** `/home/paperclip/8os/frontend`
**Supersedes** marketing/vision docs for "what actually runs." Reflects code, not roadmap.

---

## 1. Overview / Vision

8os.ai is a BaZi (Chinese astrology) **"Life Operating System"** — a productivity web app that turns a
user's birth data into a personalized *archetype*, then renders an archetype-skinned dashboard for
running their life: goals → projects → energy-timed tasks → calendar, plus a daily AI briefing, a
journal, and an always-on conversational **AI Assistant** that reads and writes the user's OS via tools.

North star (per `docs/BUILD-DIRECTIVE.md`): make it **usable and dogfoodable** — a real person signs up,
gets their archetype + a live dashboard, and uses the assistant daily. Monetization/marketing plumbing
is explicitly deprioritized.

---

## 2. Architecture (as-built)

- **Frontend + API:** Single **Next.js 14 (App Router)** app, `src/app`, deployed on **Railway**
  (service `frontend`, Railway project `27eb0f95`). Serves `8os.ai` / `www` / `api` / `dash` through a
  **Cloudflare Worker** (`8os-proxy`) which terminates TLS — Railway custom-domain certs are bypassed.
- **Deploy:** `railway up --service frontend` from the droplet repo. **No GitHub, no Vercel** (both retired).
  Health check: `GET /api/health`.
- **Auth:** **Clerk** is the primary system — all `/api/*` handlers call `requireAuth()`
  (`src/lib/auth/require-auth.ts`), which reads the Clerk session and find-or-creates an app `User`
  mapped by `clerkUserId`/email. **A legacy JWT-cookie auth still coexists** (`access_token` +
  `JWT_PUBLIC_KEY`, RS256, issuer `8os`) and is used by some server pages (e.g. journal). This dual-auth
  is a real inconsistency (see Gaps).
- **DB:** **Postgres via Prisma** (`prisma/schema.prisma`). ~30 models.
- **Cache/queue:** **Redis** (`src/lib/redis/client.ts`) — used for daily-insight caching and rate limits.
- **BaZi / archetype engine ("ARCHIE"):** Pure-TS, in-repo (`src/lib/bazi.ts`, `bazi-strength.ts`,
  `sun-sign.ts`, `time-quiz.ts`, `archie-engine.ts`, `archetype.ts`). 17,280 base archetype combos
  (12 sun signs × 10 Day Masters × 3 strengths × 4 personality types × optional hour pillar). Also a
  standalone `os-generator` Python engine exists on the droplet (56 tests) but the **live app uses the
  TS engine**.
- **AI / LLM providers:**
  - **AI Assistant** → **Flow AI API** (`https://api.flowaiapi.com`, OpenAI-compatible), `src/lib/flow-ai.ts`,
    streaming + tool calling. Key `FLOW_AI_API_KEY`.
  - **Daily briefing/insight** → **DeepSeek** (`src/lib/deepseek/*`), 1 call/user/day, Redis-cached 24h,
    template fallback.
  - **Project generation** → **Anthropic** (`ANTHROPIC_API_KEY`/`ARCHIE_API_KEY`) with smart-default fallback
    (`/api/archie/projects`).
- **Calendar:** Two paths — (a) native `CalendarEvent` Prisma model (`/api/calendar`), and
  (b) **Cal.diy** REST proxy (`src/lib/caldiy/client.ts`, `/api/cal-diy/*`) reading event-types/bookings
  from a self-hosted Cal.diy (`/home/paperclip/8os/cal-diy-api`). Assistant→Cal.diy *write* is a stub.
- **Encryption:** Birth data (date/time) stored **encrypted** (`src/lib/encryption.ts`, `ENCRYPTION_KEY`,
  64-char). Birth endpoint hard-fails 503 if key misconfigured.

---

## 3. Feature / Screen Inventory (grouped)

### A. Onboarding (`src/app/onboarding/*`) — REAL
- `/onboarding` (intro), `/onboarding/birth` (birth date/time/location/gender/GDPR),
  `/onboarding/quiz` (personality + time-estimate quiz), `/onboarding/define`,
  `/onboarding/archetype` (reveal), `/onboarding/goals`, `/onboarding/projects`.
- APIs: `POST /api/onboarding/birth` (validates, encrypts, computes BaZi day master; IP rate-limited 5/hr),
  `POST /api/onboarding/quiz`, `POST /api/onboarding/archetype` (recomputes BaZi + scores quiz +
  `calculateArchetype` + **seeds the user's OS config** via `seedOSConfigForUser`).

### B. Archetype (`src/app/(dashboard)/dashboard/archetype`, `/archetypes/*`) — REAL
- Personal archetype view + `/archetype/compare`. Public marketing archetype explorer
  (`/archetypes`, `/archetypes/[slug]`, `/archetypes/famous/*`, `/archetypes/signs`, `/archetypes/explorer`).
- APIs (ARCHIE, `docs/archie-engine.md`): `POST /api/v1/archetype/generate`,
  `GET /api/v1/archetype/[archetype_id]`, `GET|POST /api/v1/quiz/time-estimate`, `/api/v1/archetype`.

### C. Dashboard home (`/(dashboard)/dashboard`) — REAL
- `GET /api/dashboard` returns user + archetype + active goals (w/ projects) + today's tasks
  **ordered by energy hours** (`orderTasksByEnergyHours`) + energy profile + upcoming calendar events +
  recent activity, in one call. Default green/yellow/red energy map when no profile.

### D. Goals / Projects / Tasks — REAL (full Prisma CRUD)
- Pages: `/dashboard/goals`, `/dashboard/projects`, `/dashboard/tasks`, `/goals`, `/goals/[id]`.
- APIs: `/api/goals` + `/api/goals/[id]`, `/api/tasks` + `/api/tasks/[id]`,
  `/api/archie/projects` (AI-generate), `/api/archie/tasks`.
- Domains: career/wealth/health/relationships/learning/legacy. Goal check methods:
  binary/numeric/time/streak/milestone. Tasks carry `energyRequired` (green/yellow/red), duration,
  priority, recurrence.
- **NLP quick-add:** `POST /api/nlp` parses free text → structured task (+ drift-signal logging).

### E. Calendar (`/(dashboard)/calendar`) — REAL (native) + Cal.diy (read)
- `/api/calendar` (native CRUD on `CalendarEvent`, links to tasks),
  `/api/cal-diy/event-types`, `/api/cal-diy/bookings` (read proxy to Cal.diy v2),
  `/api/schedule`, `/api/energy`.

### F. Daily Briefing (`/dashboard/briefing`) — REAL
- `GET /api/dashboard/briefing` assembles archetype + goals + today's tasks + events + timezone, then
  `getDailyInsight()` (DeepSeek, cached, template fallback). Feedback via `/api/insights/feedback`.

### G. AI Assistant (`docs/assistant-feature.md`) — REAL (chat + tools), Cal.diy-write STUB
- `POST /api/assistant/chat` — streaming, multi-round (max 5) tool execution via Flow AI.
- `/api/assistant/conversations` + `[id]` — persisted history (`AssistantConversation`/`AssistantMessage`).
- Tools (`assistant-tools.ts` / `assistant-tool-executor.ts`, all real Prisma): `get_goals`, `update_goal`,
  `get_projects`, `create_project`, `update_project`, `get_tasks`, `create_task`, `complete_task`,
  `get_calendar_events`, `create_calendar_event`, `get_archetype_info`, `get_energy_hours`.
- UI: floating `AssistantPanel` in dashboard layout.
- **STUB:** `POST /api/assistant/cal-diy/schedule` returns **501** ("Direct Cal.diy scheduling via API
  not yet supported").

### H. Journal (`/dashboard/journal`) — PARTIAL / Pro-gated, NO persistence model
- Page renders behind **legacy JWT cookie auth** (not Clerk) and is gated as a **Pro feature**
  (free users see upgrade prompt). **There is no `Journal` model in `schema.prisma`** — journal entries
  are not persisted server-side. Effectively a placeholder surface.

### I. Account / Settings — REAL
- `/(dashboard)/settings/profile`; `/api/user/profile`, `/api/user/sessions`, `/api/user/export`
  (GDPR), `/api/user/delete`. Auth: `/api/auth/me`, `/api/auth/logout`, `/api/auth/totp`,
  `/api/auth/telegram/callback`; `/api/webhooks/clerk`.

### J. Marketing / public site — REAL (static-ish)
- Home `/`, `/en`, `/zh`, `/features`, `/pricing`, `/how-it-works`, `/methodology`, `/philosophy`,
  `/about`, `/faq`, `/security`, `/privacy`, `/terms`, `/press`, `/community`, `/contact`,
  `/changelog`, `/coming-soon`, `/quiz`, `/register`.
- **Two blog trees:** `/blog/*` AND `/blog-new/*` (duplicate set — cleanup candidate).
- Auth pages: `(auth)/login|signup|forgot-password|reset-password`.

### K. Affiliates / Waitlist / Developers — REAL but off the dogfood path
- `/affiliates`, `/affiliates/terms`, `/developers/dashboard`.
- APIs: `/api/affiliate/*`, `/api/affiliates/*` (conversions/export/[code]), `/api/waitlist/*`,
  `/api/v1/keys`, `/api/v1/context`, `/api/meta/capi` (Meta CAPI), `/api/generate`, `/api/insights`.

---

## 4. Data Model (Prisma entities)

- **Identity/auth:** `User`, `UserProfile` (encrypted birth data), `Session`, `OtpCode`,
  `PasswordReset`, `OauthAccount` (legacy auth stack, parallel to Clerk).
- **Archetype:** `QuizResponse`, `ArchetypeResult`, `EnergyProfile`.
- **OS core:** `Goal`, `OSProject`, `OSTask`, `CalendarEvent`, `ActivityLog`, `UserSettings`.
- **Insights/assistant:** `DailyInsight`, `InsightFeedback`, `AssistantConversation`, `AssistantMessage`.
- **Growth:** `Affiliate`, `ReferralClick`, `ReferralAttribution`, `AffiliateConversion`.
- **Enums:** `UserRole`, `OtpChannel`, `AffiliateStatus`, `AffiliatePayoutStatus`, `GoalStatus`,
  `TaskStatus`, `TaskPriority`, `RecurrenceRule`.
- **Missing:** no `Journal`/`JournalEntry` model despite a Journal screen.

---

## 5. SPEC vs REALITY — GAPS / TODO

### Specced but stubbed / incomplete
1. **Journal has no backend.** Screen exists + is Pro-gated, but no `Journal` Prisma model → entries
   aren't saved. (`/dashboard/journal`)
2. **Assistant cannot create Cal.diy bookings.** `/api/assistant/cal-diy/schedule` is a 501 placeholder.
   Assistant calendar writes only hit the **native** `CalendarEvent` table, not Cal.diy.
3. **Cal.diy is read-only / shallow.** Only event-types + bookings list are proxied; no native booking
   creation, no availability sync, no two-way calendar sync (caldiy-integration-plan Phases 2–3 unbuilt).
4. **Dual / fragmented auth.** Clerk drives APIs; a full legacy JWT+OTP+OAuth stack
   (`Session`/`OtpCode`/`OauthAccount`, journal page) still exists. Risk of drift and security confusion —
   pick one and remove the other before launch.
5. **Three LLM providers, three keys.** Assistant=Flow AI, briefing=DeepSeek, project-gen=Anthropic.
   BUILD-DIRECTIVE says route assistant LLM through Flow AI; briefing/project-gen still bypass it.
6. **os-generator (Python) vs ARCHIE (TS) duplication.** Two archetype engines; only the TS one is live.
   The Python engine (56 tests) is dead weight unless re-wired.

### Built but unspecced / beyond the dogfood scope
1. **Affiliate / referral system** (`Affiliate`, conversions, payouts, `/affiliates/*`) — fully modeled
   though BUILD-DIRECTIVE deprioritizes monetization.
2. **Developer API surface** (`/api/v1/keys`, `/api/v1/context`, `/developers/dashboard`) — public API
   product not in the core spec.
3. **Meta CAPI + waitlist + Telegram callback + TOTP** — marketing/analytics/2FA plumbing.
4. **Duplicate blog trees** (`/blog` and `/blog-new`) and duplicate `/en` + `/zh` + `/` home variants.

### Top items to close before launch
- Decide and consolidate **auth** (Clerk-only is the cleaner path).
- Either **ship Journal persistence** (add model + API) or hide the screen.
- Make the **assistant's calendar story coherent** — either drop Cal.diy from the assistant or finish
  the booking-create path; today it half-promises Cal.diy and 501s.
- Remove dead duplicates (`/blog-new`, unused `os-generator`) to reduce confusion.

---
*Generated by spec-reconciliation pass. Cite file/route names above when filing follow-ups.*
