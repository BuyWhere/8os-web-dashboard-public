# 8OS — Master Product Spec (corrected & vision-aligned)

**Status:** authoritative. Supersedes drift. Reconciles the original plans (board OS-2, OS-22, OS-27, OS-89, OS-219/220, OS-93/180 + `docs/BUILD-DIRECTIVE.md`, `docs/archie-engine.md`, `docs/assistant-feature.md`) with the owner's restated intent (2026-06-30) and the verified gap audits.
**Last updated:** 2026-06-30 by operator.

---

## 0. Confirmed direction (owner, 2026-06-30)

**North star — what 8os is for:** help people **achieve their goals and become the best version of themselves.** The product actively **pushes, tracks, and holds you accountable** while helping you operate day to day. It combines, in one conversational agent:
- an **automated goal tracker** (your goals → projects → tasks, always current),
- an **accountability partner** (checks in, follows up, surfaces drift, nudges you forward),
- a **vision-board builder** (a living picture of the future you're working toward),
all tuned to **your archetype**.

**Locked decisions:**
1. **Energy-hours: removed for good.** Time-of-day "energy" is not real/accurate (many failed apps before). Scheduling uses priority, deadlines, real calendar availability, and the user's editable working preferences — never invented energy peaks.
2. **Full ARCHIE engine (17,280 combinations) is the engine of record.** Granularity is the point — every birth chart yields a genuinely distinct, suitable archetype. The 10-archetype engine is retired.
3. **The agent operates the dashboard for you.** Powered by Flow AI; the user talks to it and it creates/edits goals, projects, tasks, and calendar events on their behalf, in their archetype's style.


---

## 1. What 8os actually is (vision)

8os organizes a person's **life and productivity around their real personality type**, derived from their **BaZi reading** (Chinese metaphysics) + Sun sign + a short personality quiz. Different personality types work differently — different environments, different ways of structuring work, different scheduling and coaching styles — so **the productivity suite itself adapts to the archetype**, and the user can **calibrate** it.

The daily driver is a **helper assistant** you talk to in natural language about the **real goals you want to accomplish**. It organizes those goals into projects and tasks **in the way that suits your archetype**, and — when that suits you — **fills your calendar and schedules the work**. Everything is connected: goals → projects → tasks → calendar → events.

### Non-negotiable principles
1. **Nothing hardcoded, nothing fake.** Every archetype, goal, schedule, and insight is computed from the user's real inputs. Different birthdays / birth times / charts MUST produce genuinely different results.
2. **One source of truth per concept.** One archetype engine, one onboarding flow, one scheduler — no competing/legacy duplicates.
3. **Calibratable, not prescriptive.** The archetype sets sensible defaults; the user can adjust.
4. **No pseudo-science.** Remove the "energy hours" concept (the claim that people are inherently energetic at fixed times). Scheduling is driven by **priority, deadlines, real calendar availability, and the user's own (archetype-seeded, editable) working preferences** — not invented energy peaks.
5. **Operable, not decorative.** Every surface that shows a plan must let the user act on it (complete, edit, reschedule, create).

---

## 2. The Archetype Engine (ARCHIE) — the core

**One** engine: `src/lib/archie-engine.ts` (`generateArchetype`). Inputs → output:

| Input | Source |
|---|---|
| Sun sign (12) | birth date |
| BaZi Day Master (10 stems) + strength (strong/weak/balanced) | birth date (+ time, gender, location for precision) |
| Personality type (systematic/intuitive × goal/process = 4) | 10-question quiz |
| Hour pillar (optional, 12) | birth time, or time-quiz estimate |

→ **one archetype**: `archetypeId` (e.g. `capricorn_geng_strong_sg`), `archetypeName` (e.g. "The Mountain Forge"), description, and a **personalization profile** (below). 17,280 base combinations.

**Requirements / fixes:**
- **R1. Kill the hardcoded archetype.** `src/app/onboarding/page.tsx:391` hardcodes "The Commander" and never calls the engine. The archetype reveal must render the **computed** result for the user's inputs.
- **R2. One engine, one result shape.** Eliminate the competing `hybrid_explorer`-style output path; the onboarding API, dashboard, and assistant must all read the same `ArchetypeResult`.
- **R3. Verified variability.** Different birth data → different archetypes (regression test across ≥10 distinct profiles; see §10).
- **R4. Calibration.** After reveal, the user can fine-tune personality type (and re-estimate hour pillar via the time quiz) and the archetype recomputes.

### Per-archetype personalization profile (what actually differs)
Per OS-220 / OS-180, each archetype carries:
- **Dashboard skin** — color palette, typography, metaphor (12 Sun-sign themes minimum).
- **Goal & task templates** — domain-adapted starting structure.
- **Working preferences** — default work-block length, batch-vs-spread, focus/buffer ratio, planning cadence, preferred working window (all **user-editable**; replaces "energy hours").
- **Coaching tone & rituals** — how the assistant talks and what review/ritual cadence it nudges.

> Today only two influence points are real: onboarding seed content + assistant prompt flavor. The mechanics (task structure, scheduling) are one-size-fits-all. Making the **working-preferences profile** drive real behavior is the central build (see §9).

---

## 3. Onboarding (one flow, real result)

`Birth details → BaZi compute → 10-q quiz → REAL archetype reveal → first goals → dashboard.`
- Birth date (required); time optional (noon default + "approximate" flag) + time-quiz to estimate hour pillar; gender (BaZi); location (timezone/solar correction).
- Reveal shows the **computed** archetype + its profile, with a "this doesn't feel right? calibrate" path.
- On completion, seed the dashboard from the **os-generator** with archetype-themed goals/projects/tasks (already works: 6 goals + projects + tasks).
- **Remove** the legacy single-page `onboarding/page.tsx` fake; keep one Clerk-authed flow.

---

## 4. Dashboard (operable)

Surfaces, all archetype-skinned and **actionable**:
- **Today / Briefing** — a real morning view + a guided "plan my day" (assign tasks to slots, accept/move/skip). Not a passive digest.
- **Goals** — create/edit, link projects, track progress.
- **Projects / Tasks** — inline complete, edit, reorder, filter; create from anywhere (quick-capture inbox that exposes parsed fields as editable chips).
- **Calendar** — view + drag/click-to-schedule + reschedule; native events + Cal.diy bookings in one timeline.
- **Archetype profile** — the user's computed archetype, its working preferences, and calibration controls.
- **Assistant** — always-on (see §6).
- **Weekly review** — completion, carry-over, goal deltas, archetype-toned reflection (folds in OS-22 + gives Journal a real purpose).

---

## 5. The Helper Assistant (north star)

Always-on conversational assistant (Flow AI). You talk to it about real goals; it acts via tools on your real OS data, in your archetype's style.

**Tool set (current → required):**
| Tool | Status | Action |
|---|---|---|
| get_goals / update_goal | ✅ | keep |
| **create_goal** | ❌ missing | **ADD** — create a goal (domain, definition, archetype-styled) from conversation |
| get_projects / create_project / update_project | ✅ | keep (create_project must auto-create/attach a goal instead of throwing) |
| get_tasks / create_task / complete_task | ✅ | keep (drop hardcoded `energyRequired:'green'`) |
| get_calendar_events / create_calendar_event | ✅ | keep |
| **schedule_task** | ❌ missing | **ADD** — expose `/api/schedule` (auto slot-finder) so the assistant can actually fill the calendar |
| get_archetype_info | ✅ | keep |
| ~~get_energy_hours~~ | ⛔ remove | replace with `get_work_preferences` (archetype defaults + user calibration) |

**System prompt:** remove the "peak energy hours / schedule during these times" language; replace with the archetype's working preferences and the principle that scheduling respects real availability, priority, and deadlines.

**Definition of the core loop working:** user says "I want to launch a side business in 3 months" → assistant creates a goal (right domain, archetype-styled), proposes projects/tasks, and offers to schedule the first tasks → on yes, it books real calendar slots. Verified end-to-end.

---

## 6. Scheduling & calendar

- **Auto-scheduler** `/api/schedule` (`lib/scheduling/engine.ts:findBestSlot`): pick a conflict-free slot from real calendar, honoring **working window + priority + deadline + archetype work-block prefs** (NOT energy peaks). Writes `OSTask.scheduledAt` + a `CalendarEvent`. **Expose to the assistant** (schedule_task).
- **Cal.diy**: today read-only (bookings/event-types GET). Finish **booking-create** so the assistant's `cal-diy/schedule` 501 stub becomes real, OR standardize on the native `CalendarEvent` table and treat Cal.diy as the external sync/booking-page only. Decide one; remove the 501 dead-end.
- One timeline merges native events + Cal.diy bookings.

---

## 7. Integrations (explicit)

| Integration | Purpose | Status | To do |
|---|---|---|---|
| **Clerk** | auth (all pages + APIs) | split-brain (some pages use legacy JWT) | **consolidate to Clerk**, delete legacy `Session/OtpCode/OauthAccount/PasswordReset` |
| **Flow AI** (`api.flowaiapi.com`) | all assistant LLM calls | ✅ assistant | also route **briefing** (now DeepSeek) + **project-gen** (now Anthropic) through Flow AI |
| **os-generator** (Railway) | BaZi + archetype + seed config | ✅ seeds onboarding | ensure single archetype engine of record; add variability tests |
| **tududi** | tasks/projects backend | partially wired | confirm bridge or fold into native `OSTask/OSProject` |
| **Cal.diy** (self-hosted) | calendar + booking pages | read-only | booking-create + OAuth (Google) |
| **PostHog** | analytics | ✅ | keep |

---

## 8. Data model (Prisma)

Keep: `User`, `UserProfile`, `ArchetypeResult`, `Goal`, `OSProject`, `OSTask`, `CalendarEvent`, `AssistantConversation`, `AssistantMessage`.
Change: **retire `EnergyProfile`** → `WorkPreferences` (archetype-seeded defaults, user-editable: working window, block length, batch/spread, planning cadence). Add **`JournalEntry`** (the Journal screen is paywalled over nothing). Remove the legacy auth tables.

---

## 9. What's being removed (the fakes)

1. **Hardcoded "The Commander"** in onboarding (`onboarding/page.tsx:391`).
2. **Competing `hybrid_explorer` archetype system** — unify to ARCHIE.
3. **"Energy hours"** pseudo-science (~20 files) — reframe to editable working preferences.
4. **Fake social proof** on the landing page (already removed: "As Seen On" logos, "247 today/thousands").
5. **501 scheduler stub** + read-only Cal.diy dead-end.

---

## 10. Definition of "usable" + test plan

**Usable = a real person signs up, gets their *real* computed archetype, lands on a populated archetype-skinned dashboard, talks to the assistant to add a real goal, and the assistant organizes it into projects/tasks and schedules the first ones onto their calendar — all persisted, all theirs, nothing faked.**

Automated coverage (extend the operator QA harness, Clerk session-injection):
- Archetype variability: ≥10 distinct birth profiles → ≥N distinct archetypes; onboarding UI shows the computed one (no "Commander" unless computed).
- Core loop: assistant `create_goal` → `create_project`/`create_task` → `schedule_task` writes a real CalendarEvent; verify in DB.
- Operability: tasks complete/edit/reorder; calendar reschedule; all persist.
- No energy-hours references remain in prompts/tools/UI.
- Auth: every page + API behind Clerk only.

---

## 11. Build order (prioritized)

**P0 — make the core loop real (this sprint):**
1. Real computed archetype in onboarding (kill Commander) + unify to one engine (R1–R3).
2. Assistant `create_goal` + `schedule_task` tools; drop energy-hours from prompt/tools.
3. Variability + core-loop tests green.

**P1 — operable + correct:**
4. Operable tasks/projects/calendar (complete/edit/drag/reschedule) + quick-capture.
5. Consolidate auth to Clerk; remove legacy stack.
6. Cal.diy booking-create OR native-calendar standardization; kill the 501.
7. Route briefing + project-gen through Flow AI.

**P2 — the differentiator + retention:**
8. Working-preferences profile actually drives task structure + scheduling per archetype (+ calibration UI).
9. Per-archetype dashboard skins (12 Sun signs).
10. Weekly review + Journal backend (OS-22 coaching folded in).
