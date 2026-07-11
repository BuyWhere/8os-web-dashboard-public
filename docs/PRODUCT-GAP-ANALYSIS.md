# 8os Product Gap Analysis — Productivity Model vs. Leading Apps

_Authored 2026-06-30. Grounded in a direct read of the live source under `src/app` and `src/components/dashboard`. Comparison set: Notion, Todoist, Motion, Sunsama, Reclaim.ai, Structured, Things, Amie, Linear, Akiflow._

---

## 0. What 8os actually is today (verified from source)

8os generates a BaZi-derived **archetype** + an **energy `hourMap`** (green/yellow/red per hour), then wraps a fairly conventional goal → project → task hierarchy around it. The screens that exist:

- **`/dashboard`** (`(dashboard)/dashboard/page.tsx`): greeting, streak + "this week" counters, archetype welcome banner, a DeepSeek "Today's Insight" card, Goals Overview (progress rings), "Today's Focus" (top 6 tasks, energy dot per task via `orderTasksByEnergyHours`), `CalendarMini`, and a Metrics panel.
- **`/dashboard/briefing`** (`BriefingContent.tsx`): read-only digest — Today's Insight, Today's Tasks, Upcoming Events, Active Goals.
- **`/dashboard/tasks`**: read-only bucketed list (In Progress / Today / Upcoming / Unscheduled / Recently Done). **No checkbox, no edit, no filter** (the file comment claims filtering that isn't implemented).
- **`/dashboard/projects`**: read-only grouped cards. Non-clickable, no CRUD, `suggestedOrder` queried but never reorderable.
- **`/goals`** + **`/goals/[id]`**: goal cards (clickable) + detail.
- **`/dashboard/journal`**: **Pro paywall over a "coming soon" placeholder** — the advertised mood/energy tracking and weekly synthesis are entirely unbuilt.
- **`/dashboard/archetype`** (`ArchetypeContent.tsx`): identity profile — hero, confidence %, three personality sliders. **No energy windows, no scheduling guidance, no strengths.**
- **`/calendar`** (`CalendarView.tsx`): Day/Week/Month, energy **background bands**, a "now" line, and an `Unscheduled` rail with a **`⚡ Auto-schedule`** button (POST `/api/schedule`, then full page reload). **No drag, no drop, no resize, no click-to-create.**
- **`QuickAdd`** (⌘K): NL → **task only** via `/api/nlp`; parses priority/duration/hour but the UI hides them.
- **`AssistantChat`** (Flow AI): the most capable surface — real tool calls (`create_task`, `complete_task`, `create_calendar_event`, `update_goal`, `get_energy_hours`…). No suggested prompts.

**The through-line problem:** the archetype/energy model is computed and even visualized, but it is almost never *actioned in the UI*. Energy lives server-side (`/api/schedule`) and in the assistant. Every list screen is read-only. There is no daily planning ritual, no review, no habits, no real inbox. 8os today is a **dashboard that displays a plan**, not a **system you operate**.

---

## 1. Capture / Inbox

**Best-in-class:** Todoist/Things/Akiflow treat capture as sacred — global hotkey, NL parsing ("call Sam tomorrow 3pm p1 #work"), an **Inbox** that holds anything you dump so you never lose a thought, then a separate triage step. Akiflow consolidates captures from Slack/email/Notion into one inbox.

**8os today:** `QuickAdd` (⌘K) does NL capture but **only creates tasks**, fires them straight into the DB, and the parsed `priority`/`scheduledHour`/`durationMinutes` are discarded from the UI (shown as a domain chip only). There is **no Inbox** — `/dashboard/tasks` has an "Unscheduled" bucket but it's read-only, so captured-but-unprocessed items have no triage home. You cannot capture a goal/project/note.

**Specific improvement:** Promote "Unscheduled" into a real **Inbox** with triage actions (schedule / pick energy slot / convert to project / defer / delete). Make `QuickAdd` show a confirm-chip row exposing the parsed energy/priority/time so the user can correct before commit — this is the cheapest way to make the NL parser trustworthy.

## 2. Daily Planning Ritual

**Best-in-class:** Sunsama and Motion own this. Sunsama's morning "Plan your day" walks you task-by-task, asks a time estimate for each, pulls from a backlog, warns when you over-commit vs. capacity, and has an end-of-day shutdown. Structured does a lighter timeline-based plan. This *ritual* is the product.

**8os today:** **There is no plan-my-day flow.** `BriefingContent.tsx` renders a digest (insight + tasks + events + goals) with **zero actions** — you cannot accept, schedule, estimate, or reorder anything from it. The dashboard's "Today's Focus" is similarly passive. The only thing close to planning is the calendar's `⚡ Auto-schedule` button, which is one-click magic with no user agency over placement.

**Specific improvement (highest leverage):** Convert `/dashboard/briefing` from a digest into an interactive **morning ritual**: step through each unscheduled/today task, propose an energy-matched slot ("Deep work fits 9–11am, your peak — accept?"), let the user accept/move/skip, show a capacity meter, and end with "Lock in my day." This is exactly where the archetype/energy data becomes a *differentiator* rather than decoration — Sunsama plans against a flat day; 8os can plan against *your* energy curve.

## 3. Time-Blocking

**Best-in-class:** Motion auto-builds and continuously re-optimizes your calendar; Reclaim defends habit/task blocks and reshuffles around meetings; Amie/Akiflow give buttery drag-to-block. The shared expectation: tasks become calendar blocks you can drag, resize, and that auto-defend.

**8os today:** `CalendarView.tsx` has **no drag/drop/resize/click-to-create at all** — verified, zero pointer/drag handlers. Scheduling is exclusively the server's `⚡ Auto-schedule` (then `window.location.reload()`). Energy is painted as faint 5%-opacity background bands but the user cannot act on them. This is the single biggest functional gap vs. the entire calendar-native cohort.

**Specific improvement:** Add drag-to-schedule from the Unscheduled rail onto the grid, plus drag-move/resize of existing blocks (optimistic update, no reload). Crucially, render an **energy-aware drop preview**: when dragging a task tagged `energyRequired: high`, highlight green hours and dim red ones, with a "best fit" pulse. That turns the existing `hourMap` from wallpaper into the core scheduling UX.

## 4. Prioritization

**Best-in-class:** Todoist P1–P4, Things' Today/Evening + tags, Linear's priority + ordered backlog, Motion's deadline+priority auto-ordering. All let you *set* and *re-rank* priority directly.

**8os today:** Priority exists in data (`PRIORITY_COLORS` high/med/low, a colored dot) but is **display-only everywhere** — there is no control to set or change it on tasks, projects, or goals. `orderTasksByEnergyHours` orders the dashboard's "Today's Focus," which is a genuinely novel prioritization axis (energy-fit), but it's invisible and unconfigurable.

**Specific improvement:** Make priority editable inline (and via QuickAdd confirm-chips), and **surface the energy-fit ranking as a first-class sort**: a "Sort by energy fit" toggle that explains "ordered to match your peak/rest hours." Lean into energy-fit as 8os's prioritization signature — no competitor has it.

## 5. Projects / Goals Hierarchy

**Best-in-class:** Notion's flexible databases + relations; Linear's project → issue → sub-issue with status, cycles, and ordered backlogs; Todoist sections/sub-tasks. All support rich CRUD, status, and reordering.

**8os today:** The hierarchy (Goal → `OSProject` → `OSTask`, six fixed domains) is solid conceptually and `goals/[id]` gives a detail view. But projects are **read-only cards that don't even open**, tasks can't be edited/completed in-list, nothing reorders despite `suggestedOrder` being queried, and there's no project status/health. The hierarchy is generated by ARCHIE at onboarding and then essentially frozen in the UI.

**Specific improvement:** Make a **project detail page** (`/projects/[id]`) mirroring `goals/[id]`: task list with inline complete/edit/reorder, progress, estimated vs. actual duration, and an "energy budget" (how many of this project's tasks need green hours). Add lightweight project status (On track / At risk / Blocked) so goals roll up health, not just a progress %.

## 6. Review / Reflection Rituals

**Best-in-class:** Sunsama's weekly review (what got done, what to carry over, reflection prompts); GTD weekly review in Things/Todoist; Reclaim's weekly stats. Reflection closes the loop and drives retention.

**8os today:** **None shipped.** "Weekly reflection synthesis" and "AI-summarised daily entries" are advertised *inside the Journal Pro paywall* but the Journal is a "coming soon" placeholder. The dashboard shows a streak + "done this week" count, but there is no review surface.

**Specific improvement:** Ship a **Weekly Review** screen that closes the energy loop uniquely: show completed-by-energy-window ("you finished 80% of deep work in green hours — your archetype is calibrated"), carry-over of unfinished tasks, goal progress deltas, and 2–3 archetype-flavored reflection prompts. This is where BaZi/energy becomes a *measured feedback system*, not a horoscope — the strongest possible differentiator and the natural anchor for the Journal Pro feature.

## 7. Habits

**Best-in-class:** Reclaim "Habits" auto-find recurring time; Structured recurring blocks; Todoist recurring tasks + streaks; dedicated trackers (Streaks/Habitica).

**8os today:** No habit concept and no recurring tasks — every `OSTask` is one-off. The global streak counter (`computeStreak`) counts any task completion, so it's a generic activity streak, not a habit streak. The onboarding `define` step even offers a "Streak 🔥" measurement type for goals, but nothing in the app tracks habit streaks.

**Specific improvement:** Add **energy-anchored habits** — recurring tasks that auto-place into a preferred energy window each day (e.g. "Workout → daily, your yellow/green morning"). This directly reuses the `hourMap` + the existing streak machinery and fits the "operating system" framing far better than one-off tasks.

## 8. Notifications / Nudges

**Best-in-class:** Motion/Reclaim proactively notify on conflicts and reshuffles; Akiflow nudges for time-block start; Todoist reminders. The landing page itself promises "Works in Telegram."

**8os today:** No in-app notification center (the `Sidebar` has no bell, no counts, no today badge). The DeepSeek "Today's Insight" is the only proactive content, and it's passive text on the dashboard. No conflict/over-commit warnings.

**Specific improvement:** Add an **energy-aware nudge layer**: "You scheduled a high-energy task at 3pm (your red window) — move it?" and a start-of-block nudge. Surface these in a sidebar bell + push via the already-promised Telegram channel. Even one good nudge type ("don't waste your peak hours") would feel native to the model.

## 9. Onboarding

**Best-in-class:** Motion/Sunsama tie every onboarding choice to an immediate planning payoff and get you to a usable surface fast; Notion drops you into a templated workspace.

**8os today:** Genuinely strong in places — the **live Day-Master preview** in `onboarding/birth` (instant gratification), **BaZi-driven quiz skipping** ("N questions skipped"), the **shareable archetype reveal**, and **ARCHIE generating an editable project roadmap** (accept/reject/reorder/rename) are real differentiators no competitor has. But: (1) a **legacy `onboarding/page.tsx`** still exists with a fake hardcoded "The Commander" archetype and a 2-question quiz that claims "10 questions" — a credibility landmine if reachable; (2) **inconsistent progress** (three indicator systems; "Step 1 of 6" only starts at goals, hiding ~4 prior screens); (3) the funnel is long and **front-loads GDPR + gender** before payoff; (4) the reveal *shows* peak-energy windows but **never explains they will drive your daily schedule**.

**Specific improvement:** Delete/redirect the legacy onboarding page. Unify progress into one "Step N of M" across the whole funnel. Most importantly, **bridge the reveal to action**: end the archetype reveal with "Here's your peak window — we'll schedule your deep work here," so the user sees the energy model as functional, not novelty.

## 10. Empty States

**Best-in-class:** Things/Notion treat empty states as onboarding — illustrated, with a single clear primary action and often a sample item.

**8os today:** Empty states exist and are decent but inconsistent and dead-endy: tasks → "Press ⌘K to add your first task"; projects → "Complete onboarding to generate your first projects"; goals → "Set up your first goal →"; Journal (Pro) → "coming soon." They point at ⌘K or onboarding but never demonstrate the energy/archetype value.

**Specific improvement:** Make empty states *teach the differentiator*: the tasks empty state could show a ghost "sample" task already placed in a green hour with a caption "tasks get scheduled into your peak energy — try adding one." Turn each empty state into a one-tap action that produces a visibly energy-aware result.

## 11. Mobile

**Best-in-class:** Structured, Things, Amie, Todoist are mobile-first with native apps; the cohort assumes capture and review happen on a phone.

**8os today:** Web-only, and **not responsive in key places** — `/dashboard/tasks` uses a hardcoded `gridTemplateColumns: '1fr 1fr'` with no breakpoint (won't collapse on mobile); the `Sidebar` has collapse but no responsive/mobile trigger; the calendar's absolute-positioned grid is desktop-shaped. The landing page promises "Works in Telegram," implying mobile capture, but the dashboard itself isn't mobile-tuned.

**Specific improvement:** Ship a responsive pass (single-column task/dashboard grids, a mobile sidebar drawer) and lean on **Telegram as the mobile capture+briefing channel** — deliver the morning energy plan and accept quick captures there, which sidesteps building a native app while honoring the landing-page promise.

---

## 12. The archetype/energy angle: differentiator vs. gimmick

**Where it's a real differentiator (and should be amplified):**
- `orderTasksByEnergyHours` + the `hourMap` give 8os a **scheduling axis no competitor has**: fit work to *your* energy curve, not a generic 9–5.
- The onboarding (Day-Master preview, BaZi quiz-skipping, ARCHIE roadmap, shareable reveal) is a genuinely novel, viral funnel.
- A **weekly review that measures completion-by-energy-window** would make the model self-proving ("you finish more in green hours") — turning astrology into a feedback loop.

**Where it's currently a gimmick (because it's not actioned):**
- The archetype profile (`ArchetypeContent.tsx`) is pure identity — **no energy windows, no scheduling guidance** — so it reads as a personality quiz result.
- Energy bands on the calendar are 5%-opacity wallpaper you can't act on.
- The reveal advertises peak windows that the daily UI never references back.

**The fix is consistent across every section above:** take the energy/archetype data that already exists server-side and make it the *visible reason* behind planning, prioritization, nudges, and review. The model is good; the UI just isn't using it.

---

## 13. Proposed new / refined screens

**A. True "Today" view (refine `/dashboard/tasks`).** A single actionable surface for today: an energy timeline on the left (your green/yellow/red hours as a vertical ribbon) with today's tasks docked into their slots, an Inbox/Unscheduled rail on the right, inline complete/check, drag-to-slot, and a capacity bar. Replaces the current passive 5-bucket read-only list. Fits the model because "today, scheduled to your energy" is the core promise — and it's the screen users will open every morning.

**B. Plan My Day ritual (refine `/dashboard/briefing`).** Convert the digest into a guided morning flow: greet with the archetype insight, then step through each unplanned task proposing an energy-matched slot, let the user accept/move/skip, warn on overcommit, and end with "Lock in." This is the Sunsama-killer move, except planned against the energy curve instead of a flat day.

**C. Energy-aware calendar (upgrade `CalendarView.tsx`).** Add drag-to-schedule, move, and resize, with the energy `hourMap` driving a live drop-preview (highlight green hours for high-energy tasks). Keep `⚡ Auto-schedule` as a "do it for me" option but give the user manual control. This is table-stakes parity with Motion/Amie *plus* the energy overlay as the unique twist.

**D. Weekly Review.** A Sunday/Friday ritual: tasks completed vs. planned, **completion-by-energy-window chart**, goal progress deltas, carry-over of unfinished items into next week, and archetype-flavored reflection prompts. Closes the loop, proves the energy model with data, retains users, and gives the stalled Journal Pro feature a real home.

**E. Habit Tracker (energy-anchored).** Recurring tasks that auto-place into a preferred energy window daily, with per-habit streaks (reusing `computeStreak`) and a simple grid. Fits the "operating system" framing and reuses the energy infra with near-zero new modeling.

**F. Quick-Capture Inbox.** A real inbox holding everything captured via QuickAdd/Telegram/assistant, with a triage step (schedule into energy slot / convert to project / defer / delete). Pairs with a smarter `QuickAdd` that exposes parsed energy/priority/time as editable confirm-chips before commit. Makes capture trustworthy and gives unprocessed items a home.

**G. Archetype → Action profile (upgrade `ArchetypeContent.tsx`).** Add the missing **energy windows**, a strengths/watch-outs list, and 2–3 concrete scheduling recommendations ("front-load decisions before noon"), each with a one-tap "apply to my schedule." Converts the profile from identity card to operating manual — the literal "OS" the brand promises.
