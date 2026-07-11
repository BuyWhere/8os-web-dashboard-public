# 8os — Multi-Timescale BaZi Phase Guidance, Goal Taglines & Planner Feature Research

**Status:** research input (no code). For the 8os team to build from.
**Author:** research agent, 2026-06-30.
**Framing constraint (from PRODUCT-SPEC §0):** Everything here must be *accurate to real BaZi tradition* or *honestly labelled as an app-side derivation*. We do NOT invent pseudo-science. The owner already (correctly) killed the fake "energy hours" feature; "phases" must be grounded the same way. Where a layer has no traditional basis (the week), we say so and frame it as an explicit planning-horizon derivation, not a fake pillar.

---

## 0. How to read this doc

- **PART A** = the genuine BaZi temporal method (Luck Pillars → Year → Month → Day), how each is computed, and how a practitioner reads it. Maps to the owner's five layers.
- **PART B** = how to attach short BaZi-informed taglines to goals (using the *Ten Gods*, the traditional element→life-domain mapping).
- **PART C** = survey of leading productivity planners and which features to integrate, ranked by leverage, with quick-win flags against our stack (Next.js / Prisma / goals-tasks-calendar / Flow AI assistant).

**Honesty key used throughout:**
- 🟢 **Traditional** — standard, well-documented BaZi method.
- 🟡 **Interpretation** — a real practitioner reading, but schools differ / it's qualitative.
- 🔵 **8os derivation** — NOT traditional; an app-side framing we are choosing deliberately and should label as such in the UI.

---

# PART A — BaZi temporal layers (the core research)

## A.0 Prerequisite: the natal chart and the "favorable element"

BaZi ("eight characters", 八字) renders a birth moment as **four pillars** — year, month, day, hour — each a pair of one **Heavenly Stem** (天干, 10) + one **Earthly Branch** (地支, 12). The **Day Master** (日主) — the *stem of the day pillar* — represents the self, and every temporal layer is read by how its elements interact with the Day Master and the rest of the natal chart. 🟢
(Sources: Four Pillars of Destiny, Wikipedia — https://en.wikipedia.org/wiki/Four_Pillars_of_Destiny ; cosmictao BaZi library — https://www.cosmictao.com/library/bazi)

The single most important interpretive concept is the **Useful God / favorable element** (用神, *yòng shén*): the Five Element that best *balances* the chart. If the Day Master is **weak**, the favorable elements are those that **produce or reinforce** it (its resource element + same element). If the Day Master is **strong**, the favorable elements are those that **drain, control, or counter** it (output, wealth, officer). The naive "you're missing Fire so add Fire" is explicitly wrong — favorability depends on the *balance*, not on what's absent. 🟡
(Sources: bazi-web "Useful God / Yong Shen" — https://bazi-web.com/the-useful-god-yong-shen-the-most-important-element-you-need/ ; Cantian AI xiyongshen — https://www.cantian.ai/wiki/other_words_explanations/xiyongshen/ ; GuanWei BaZi — https://www.guanweibazi.com/blog/yongshen-explained)

> **Build note:** 8os already computes the Day Master + strength (PRODUCT-SPEC §2: "BaZi Day Master (10 stems) + strength (strong/weak/balanced)"). The favorable-element determination (a function of Day Master + strength) is the hinge that makes *every* layer below produce real, per-user guidance rather than generic text. This should be a first-class field on the archetype profile (e.g. `favorableElements: Element[]`, `unfavorableElements: Element[]`).

---

## A.1 LAYER 1 — Luck Pillars (大运 / Dà Yùn): the "couple-of-years"/decade phase

**What it represents.** The Luck Pillars are the 10-year life chapters that overlay the fixed natal chart. The natal chart is *potential*; the Luck Pillar decides *when and how* that potential unfolds. Each pillar introduces a new Stem+Branch whose elements interact with the Day Master, defining the *character of the decade* (expansion vs. consolidation — see below). 🟢
(Sources: shen-shu 10-year luck cycle — https://www.shen-shu.com/en/blog/bazi-10-year-luck-cycle-explanation-and-knowledge-sharing ; bazi-web Luck Pillars — https://bazi-web.com/luck-pillars-da-yun-10-year-cycles-guide/ ; Nova Masters "personal seasons" — https://novamastersconsulting.com/bazi-and-timing-how-luck-pillars-affect-your-personal-seasons/)

### How the *sequence* of pillars is derived (🟢 Traditional)
The Luck Pillars are generated **from the month pillar**, stepping through the 60-pair sexagenary cycle (六十甲子):
- The **first** luck pillar = the **next** Stem+Branch pair after the month pillar (if counting **forward**) OR the **previous** pair (if counting **backward**).
- Each subsequent pillar is the next/previous pair, each lasting 10 years.

### How *direction* (forward vs. backward) is decided (🟢 Traditional)
Determined by the user's **gender** combined with the **yin/yang polarity of the birth-year Heavenly Stem**:
- **Forward** sequence: **male born in a Yang year**, OR **female born in a Yin year**.
- **Backward** sequence: **male born in a Yin year**, OR **female born in a Yang year**.
(Source — exact rule quoted: Ba Zi / Luck Pillar, Wikibooks — https://en.wikibooks.org/wiki/Ba_Zi/Luck_Pillar ; corroborated by openfate — https://openfate.ai/en/insights/how-to-calculate-luck-pillar-start-age and bazifortune — https://bazifortune.app/blog/luck-pillars-10-year-cycles-bazi-guide)

### How the *starting age* is really calculated (🟢 Traditional)
1. From the **birth moment**, measure the time to the **nearest solar term boundary** (a 节 *jié*, the monthly cusp): count *forward* to the **next** solar term for forward charts, *backward* to the **previous** one for backward charts.
2. Convert the elapsed time to age using the classical ratio: **3 days = 1 year**, **1 day = 4 months**, (and finer: 1 *shichen*/double-hour ≈ 10 days).
3. Example: born ~19 days from the relevant solar term → 19 ÷ 3 ≈ 6 years, remainder 1 day → first Luck Pillar starts at ~**age 6 years 4 months**. This is why people start their Da Yun at different ages (commonly 1–10). 🟢
(Sources: openfate start-age — https://openfate.ai/en/insights/how-to-calculate-luck-pillar-start-age ; FateMaster Qiyun timing — https://www.fatemaster.ai/en/guides/qiyun-starting-time ; Wikibooks "divided by 3")

### How a practitioner *reads* the 10-year phase (🟡 Interpretation)
- Compare the **pillar's element to the Day Master + favorable elements**:
  - Pillar brings **favorable** elements → an **expansion / building** decade: opportunities arrive more easily, effort compounds, "helpful people" appear. *Theme: build, expand, push.*
  - Pillar brings **unfavorable** elements → a **consolidation / resting** decade (explicitly *not* a "punishment"): aggressive moves meet resistance, but foundational/quiet work pays off later. *Theme: consolidate, fortify, prepare.*
- The **Stem governs the first ~5 years**, the **Branch the second ~5 years** of the pillar — so a decade can shift in tone at its midpoint. 🟡
(Sources: Nova Masters "good luck pillar" — https://novamastersconsulting.com/how-to-tell-if-youre-in-a-good-luck-pillar-in-bazi/ ; bazi-web Luck Pillars; dev.mabts 10-year calc — https://dev.mabts.edu/bazi-10-year-luck-pillars-calculation/)

**Maps to owner's layer:** *"couple of years."* (The pillar is 10 years; 8os should surface the *current* pillar plus an explicit note of which half — stem vs. branch — and how many years remain, which gives the "couple of years" feel.)

**Compute inputs (all already available to 8os):** birth date + time + gender (+ location for solar correction) → month pillar, birth-year stem polarity; current date → which pillar is active and its remaining span. Plus the derived favorable/unfavorable elements.

**Example guidance/tagline:**
> *"You've entered a Wood building decade (2024–2034) — your favorable element. This is an expansion phase: plant ambitiously now, the first five years (stem) reward initiative. Big bets are well-timed."*
> *(consolidation example)* *"This is a fortify decade, not an expand one. Resistance to bold moves is the season talking — invest in skills, systems, and relationships that pay out in your next pillar."*

---

## A.2 LAYER 2 — Annual pillar (流年 / Liú Nián): the year

**What it represents.** The "flowing year" — each calendar year's own Stem+Branch (from the sexagenary cycle, anchored to the solar new year / 立春 *Lì Chūn*, ~Feb 4, not Jan 1). It is the **finest commonly used timing layer** and the one that "fires events." 🟢
(Sources: OraDao Liu Nian — https://www.oradao.com/blog/liu-nian-annual-luck ; URANIZE annual pillar — https://uranize.com/en/glossary/annual-pillar ; BaziChart.ai time dimension — https://bazichart.ai/en/learn/luck-pillars/)

**How it interacts (🟡 Interpretation, 🟢 mechanics).** The annual Stem/Branch is layered on **both** the natal chart **and** the active Luck Pillar, and read through the standard interactions:
- **Combination (合)** — annual element fuses with a chart element and transforms (can help or hurt depending on your favorable element).
- **Clash (冲)** — branch opposition (e.g. 子午 Rat–Horse) signals disruption/change/movement.
- Also harm (害), punishment (刑), destruction (破).
- *Which pillar it lands on* matters: hitting the **Year pillar** → elders/reputation/macro-environment; **Month pillar** → career/workplace; **Day** → self/spouse; **Hour** → children/late-life/aspirations.

**The canonical maxim:** *"The Luck Pillar sets the direction; the Annual Cycle fires the bullet."* The natal chart = baseline, Da Yun = the decade's rise/fall, Liu Nian = timing/manifestation of specific events (promotion, move, marriage, conflict). 🟡
(Source: OraDao Liu Nian; corroborated by BaziChart.ai)

**Maps to owner's layer:** *year.*

**Compute inputs:** current year → annual Stem+Branch (deterministic from the sexagenary cycle, gated on Lì Chūn); the user's favorable elements + active Luck Pillar element; the branch relationships (clash/combine) vs. the natal day/year branch.

**Example guidance/tagline:**
> *"2026 (Fire Horse) adds your favorable Fire on top of your building decade — a 'fire the bullet' year. Set your most ambitious goal of the decade for this year and act decisively."*
> *(clash example)* *"This year clashes your Day branch — expect movement and change (a move, a role switch). Channel it deliberately rather than resisting; pick the change you want before one is forced."*

---

## A.3 LAYER 3 — Monthly pillar (流月 / Liú Yuè): the month

**What it represents.** Each **solar month** (defined by the 24 solar terms / 节气, NOT the lunar month nor the Gregorian 1st) carries its own Stem+Branch. The month containing 立春 is the first (Yin 寅) month, then Mao 卯, Chen 辰, etc.; the branch sequence is fixed and the stem advances with the year. The month pillar fine-tunes the year's themes into ~30-day windows. 🟢
(Sources: cosmictao Chinese calendar — https://www.cosmictao.com/library/chinese-calendar ; Four Pillars, Wikipedia; Nova Masters 24 solar terms — https://novamastersconsulting.com/lunar/24-solar-terms/)

**How it's read (🟡 Interpretation).** Same logic, shorter horizon: the month's element vs. favorable element + whether it combines/clashes with the year and natal branches → "favorable month to launch / push" vs. "lower-key month / handle maintenance." Months are where annual guidance becomes *schedulable* ("do the big push in the favorable months of this year").

**Maps to owner's layer:** *month.*

**Compute inputs:** current date → active solar month pillar (needs the solar-term boundaries, same data already required for the natal month pillar and Da Yun start age); favorable elements; branch relations vs. year + natal day branch.

**Example guidance/tagline:**
> *"This month carries your favorable element — a green-light window. Front-load launches and outreach into the next ~4 weeks."*

---

## A.4 LAYER 4 — Daily pillar (日柱 / Rì Zhù as a transit): the day

**What it represents.** Days run on a **continuous 60-day sexagenary cycle** independent of month/year boundaries — each day has a Stem+Branch pair. As a *transit*, the day's pillar is the shortest-horizon overlay on the chart. 🟢
(Sources: Four Pillars, Wikipedia; cosmictao Chinese calendar)

**How it's read (🟡 Interpretation; weakest signal — be honest).** Traditionally the day-transit is used mainly for **date selection** (择日, choosing an auspicious day to start a venture/sign/marry) by checking the day's element + branch against the chart for clash/combine. For *daily life coaching* the signal is faint and easily over-read; reputable practice treats a single day's pillar as a light tint, not a mandate. 8os should keep the day layer **light and optional**, framed as "today leans favorable/neutral/choppy — a good/ordinary/patience day for X," never as a hard scheduling rule (which would re-introduce the energy-hours anti-pattern at day granularity).
(Sources: Four Pillars, Wikipedia — "astrological significance ... of the year, month, day and hour when [events] occur"; general 择日 practice)

**Maps to owner's layer:** *day.*

**Compute inputs:** current date → day pillar from the continuous cycle (trivial modular arithmetic from any known epoch day); favorable elements; clash vs. natal day branch.

**Example guidance/tagline:**
> *"Today's branch clashes yours — a fine day for routine and clearing the deck, a poor day for signing or launching. If you can, push the big decision a day or two."*

---

## A.5 LAYER 5 — The "week": honest derivation, NOT a pillar 🔵

**The honest truth:** the 7-day week has **no basis in BaZi**. Traditional BaZi has year/month/day/hour pillars and the Da Yun/Liu Nian overlays — there is no "week pillar." Faking one would be exactly the kind of invented mechanic the owner rejected.

**Proposed 8os framing (label it as a derivation in the UI):** treat the **week as a planning horizon, not a divinatory unit.** The week inherits its *meaning* from the **active month pillar** (the real layer just above it) and exists purely to chunk the month's guidance into an actionable weekly review/preview cadence:
- Week guidance = "month theme + where you are in the month." E.g. a favorable month → "Week 1–2: push the big rocks while the month favors you; Week 3–4: consolidate and review."
- Optionally tint a week by the **dominant day-pillars falling within it** (e.g. "three of this week's days clash your branch — keep it light"), again as a soft aggregate, clearly labelled "derived from daily transits," not a pillar.

This keeps the powerful **weekly-review ritual** (the highest-leverage planner habit — see Part C) without claiming false metaphysics. 🔵

**Maps to owner's layer:** *week.*
**Compute inputs:** active month pillar + the current week's day pillars + favorable elements. No new astronomy.

**Example guidance/tagline:**
> *"This week (derived from your favorable month): a build week — protect two deep-work blocks for your top goal. Friday's transit is choppy, so finish decisions by Thursday."*

---

## A.6 Summary table — the five layers mapped

| Layer (owner) | BaZi basis | What it represents | Compute inputs (8os already has) | Honesty | Example tagline |
|---|---|---|---|---|---|
| Couple-of-years | **Luck Pillar 大运** 🟢 | The 10-yr life chapter; expansion vs. consolidation theme; stem=first 5y, branch=next 5y | birth date+time+gender(+loc) → month pillar, year-stem polarity; current date; favorable elements | Traditional method, qualitative read | "A building decade — plant ambitiously; the next 5 years reward initiative." |
| Year | **Annual pillar 流年** 🟢 | The year that "fires events"; combine/clash vs. chart + luck pillar | current year → annual S+B (anchored to Lì Chūn); favorable elements; branch relations | Traditional | "A fire-the-bullet year — set the decade's boldest goal now." |
| Month | **Monthly pillar 流月** 🟢 | Solar-term month; tunes the year into ~30-day green/amber windows | current date → solar-month pillar; favorable elements | Traditional | "Favorable month — front-load launches into the next 4 weeks." |
| Week | **none — derivation** 🔵 | Planning horizon: month theme chunked into a weekly preview/review | active month pillar + week's day pillars | App-side, labelled | "A build week — protect 2 deep blocks; decide by Thursday." |
| Day | **Daily transit 日** 🟡 | Light tint for date-selection; favorable/neutral/choppy | current date → day pillar (mod arithmetic); clash vs. natal day branch | Real but weak; keep soft/optional | "Choppy day — routine over launches; push the signing a day." |

> **Design rule:** the further down (shorter horizon), the *softer* the claim. Decade/year guidance can be confident; day guidance is a gentle tint; the week is explicitly a planning device. This monotonic-confidence rule is what keeps the whole feature honest.

---

# PART B — Goal taglines (BaZi-informed, grounded in the Ten Gods)

## B.1 The real mechanism: the Ten Gods (十神) map elements → life domains

The traditional bridge from "elements" to "life areas (career/wealth/health/relationships/learning)" is the **Ten Gods** — the role each element plays *relative to the Day Master*. This is standard BaZi, not invented. The five core relationships (each splits into two by polarity): 🟢
(Source: bazifortune Ten Gods complete guide — https://bazifortune.app/blog/bazi-ten-gods-shi-shen-complete-guide)

| Element's relation to Day Master | Ten-God group | Life domain it governs |
|---|---|---|
| Element the Day Master **produces** (output) | 食伤 *Eating God / Hurting Officer* | **Creativity, performance, self-expression, content, products** |
| Element the Day Master **controls** (what I dominate) | 财 *Wealth* (Direct/Indirect) | **Wealth, income, assets, business, also (for some) relationships/control of resources** |
| Element that **controls** the Day Master | 官杀 *Officer / Seven Killings* | **Career, authority, status, discipline, leadership, reputation** |
| Element that **produces** the Day Master (resource) | 印 *Resource* (Direct/Indirect) | **Learning, knowledge, support, mentorship, health/nurture, study** |
| Element **same as** the Day Master (peers) | 比劫 *Friend / Rob Wealth* | **Peers, collaboration, competition, independence, self-reliance** |

So for any user we can compute: *which Five Element corresponds to each life domain for THEM* (because it's all relative to their Day Master), and *whether that element is currently favorable* (via the active Luck Pillar + Year). 🟡

## B.2 How to attach a tagline to a goal

1. Classify the goal's **domain** (career / wealth / health / learning / relationships / creative / self) — 8os already tags goal domains (PRODUCT-SPEC §5 "domain").
2. Map domain → its **Ten-God element** for this user (Day-Master-relative).
3. Check that element against the **active Luck Pillar + current Year** (and optionally month): is it **favorable now** (the decade/year supports this domain), **neutral**, or **resisted**?
4. Emit a **one-line "why now / how to approach"** tagline. Favorable → "the wind is at your back, push." Resisted → reframe as foundation-building / patience, never "don't bother."

> **Honesty guardrail:** taglines are *encouragement framed by tradition*, not predictions. Phrase as orientation ("this is well-timed", "a foundation year for this") not fortune-telling ("you will get rich"). This matches the owner's "no fake science" stance — the *mapping* is traditional; we don't over-claim outcomes.

## B.3 Example taglines (5–8 concrete)

1. **Wealth goal, wealth-element favorable in current pillar+year:**
   *"Your wealth element runs strong this decade and is reinforced this year — this is a 'press the advantage' goal. Be ambitious with the target and move early in the year."*
2. **Career/promotion goal, Officer-element favorable:**
   *"Authority is your supported domain right now. A goal aimed at visibility, leadership, or a promotion is exceptionally well-timed — put your name forward."*
3. **Creative/launch goal, Output-element favorable:**
   *"Your expressive (output) element is lit this year. Ship the thing — publish, perform, release. The timing favors output over polishing in private."*
4. **Learning/upskilling goal in a consolidation (unfavorable) decade:**
   *"This is a fortify decade for you — perfect for a learning goal. Investing in skills now compounds into your next expansion phase; depth over flash."*
5. **Health goal, Resource-element favorable:**
   *"Your nurturing (resource) element supports restoration this year. A health/recovery goal will 'take' more easily now — build the habit while conditions help."*
6. **Wealth goal in a year that clashes the wealth element:**
   *"Wealth energy meets friction this year. Treat this as a positioning goal — tighten systems and pipeline now; the payoff window opens as conditions turn favorable."*
7. **Relationship/partnership goal, peer (比劫) element prominent:**
   *"Collaboration is in season — a goal built around partners, co-founders, or community fits the moment. Lean on people rather than going solo."*
8. **Any goal landing in a strongly favorable month:**
   *"You're in a green-light month for this — front-load the hardest task into the next four weeks while the timing is with you."*

---

# PART C — Productivity-planner features: survey, fit to 8os, ranking

8os's stack: **Next.js / Prisma**, existing **goals → projects → tasks → calendar** model, an **auto-scheduler** (`/api/schedule`), and a **Flow AI conversational assistant** that operates the dashboard. The BaZi phase layers (Part A) and the archetype profile are the differentiator; planner features are the *delivery vehicle*.

## C.1 Feature survey (what each leader does, why it matters, 8os mapping)

**1. Daily planning ritual (Sunsama).** A guided 10–20 min morning flow: pick today's tasks, time-block them, set a realistic "stop time," avoid overcommitting.
- *Why it matters:* kills decision fatigue; turns a task list into an intentional day; reportedly saves 1–2 hrs/day.
- *8os mapping:* the assistant runs the ritual **in the archetype's tone**, and seeds it with the **day-transit tint + week theme** ("today leans favorable — good day to tackle your top goal's hardest task"). Reuses tasks + scheduler.
- (Source: Sunsama daily planning — https://www.sunsama.com/features/daily-planning-and-shutdown)

**2. Daily shutdown / evening review (Sunsama, Akiflow).** End-of-day reflection: what got done, time-by-channel, plan tomorrow.
- *Why:* closure + carryover; feeds the next day's plan.
- *8os mapping:* assistant-led shutdown; carryover writes back to tasks; tone from archetype. (Source: Sunsama; Akiflow morning briefing/shutdown — https://akiflow.com/)

**3. Daily Big 3 (Full Focus Planner).** Pick the **three** most important tasks each day.
- *Why:* forces prioritization; consistent progress on what matters.
- *8os mapping:* the Big 3 should be **biased toward goals whose domain is favorable this year/month** (Part B) — a uniquely 8os twist. Trivial on tasks model. (Source: Full Focus / nakishawynn planners roundup — https://www.nakishawynn.com/best-productivity-planners/)

**4. Weekly preview + weekly review ritual (Full Focus, Panda, Best Self; Sunsama weekly).** A Sunday(ish) look-back + look-ahead: completion, carryover, goal deltas, set the week's focus.
- *Why:* the single highest-leverage habit in goal systems; bridges daily execution to quarterly goals.
- *8os mapping:* **this is exactly where the 🔵 "week" layer lives** — review framed by the active **month pillar** ("a build week vs. a consolidate week"). 8os already lists a Weekly Review surface (PRODUCT-SPEC §4). (Sources: Full Focus weekly; Panda weekly section — https://pandaplanner.com/blogs/news/stay-organized-with-panda-planner-pro)

**5. Quarterly / 12-week goal cycles (Full Focus 8 annual→quarterly; Best Self 13-week roadmap).** Goals broken into ~quarter-length sprints with a roadmap.
- *Why:* quarters are short enough to stay urgent, long enough to finish something.
- *8os mapping:* **align the goal horizon to the user's BaZi year/month windows** instead of generic calendar quarters — pace the roadmap to favorable vs. consolidation months. Strong differentiator. (Sources: Full Focus; Best Self / positiveroutines — https://positiveroutines.com/best-self-journal-review/)

**6. Auto-scheduling / focus-time defense (Reclaim, Motion).** Tasks auto-placed on the calendar by priority + deadline around real events; focus blocks defended and rescheduled when meetings pile up.
- *Why:* removes manual time-blocking; protects deep work.
- *8os mapping:* 8os already has `/api/schedule` (priority + deadline + real availability — explicitly **NOT** energy peaks, per the locked decision). Add **focus-block defense** + auto-reschedule. Honor archetype work-block prefs. (Sources: Reclaim focus time — https://reclaim.ai/features/focus-time ; Motion — https://www.usemotion.com/)

**7. Time-blocking + universal inbox / quick capture (Akiflow, Structured).** One inbox aggregates tasks from many tools; drag to calendar as task/event/time-slot.
- *Why:* capture-anywhere + one place to plan beats tool-hopping.
- *8os mapping:* 8os already wants a "quick-capture inbox with editable chips" (PRODUCT-SPEC §4). The **assistant is the universal inbox** ("remind me to…", "I want to…"). (Source: Akiflow — https://akiflow.com/ , https://akiflow.com/features)

**8. Gratitude / affirmations / reflection (Panda Planner, Best Self).** Morning gratitude + affirmation; evening wins.
- *Why:* well-being + motivation; cheap, sticky, drives retention.
- *8os mapping:* fold affirmations into the **archetype voice** + frame gratitude/wins against goal progress. Pure content + a journal table. (Source: Panda Planner; positiveroutines)

**9. Habit tracking (Panda monthly habits; many).** Recurring habit streaks.
- *Why:* habits are how goals actually get executed daily.
- *8os mapping:* recurring tasks + a streak view; archetype-recommended cadence. Medium build (recurrence model).

**10. Flexible DB / templates (Notion).** Endless customization.
- *Why:* power users love it; also its weakness (no opinion).
- *8os mapping:* mostly an **anti-pattern** for 8os — 8os's value is the *opinionated, archetype-tuned* default, not a blank canvas. Borrow only the "goal/task templates per archetype" idea (already in spec §2). Low priority.

## C.2 Ranking — top 8 by leverage for 8os (with quick-win flags)

Leverage = (differentiates 8os via BaZi/archetype) × (retention impact) ÷ (build cost).

| # | Feature | Why it's high-leverage for 8os | Build size on our stack |
|---|---|---|---|
| **1** | **Weekly review + preview ritual** | Highest-impact planner habit; it's the natural home for the 🔵 week layer + month-pillar framing; spec already wants it | 🟢 **Quick win** — assistant flow + reads existing tasks/goals; add month-pillar tint |
| **2** | **Assistant-led daily planning ritual** | Sunsama's killer feature, delivered conversationally in archetype voice; seeds the day with the day-transit tint | 🟢 **Quick win** — assistant + scheduler + tasks all exist |
| **3** | **Daily Big 3, biased to favorable-domain goals** | Forces prioritization AND surfaces the BaZi timing edge daily | 🟢 **Quick win** — pure logic over tasks + Part B mapping |
| **4** | **BaZi-timed quarterly/12-week goal cycles** | Turns abstract phase guidance into a concrete goal cadence; deeply differentiating | 🟡 **Medium** — goal horizon + roadmap UI; needs month/year layer compute |
| **5** | **Goal taglines (Part B engine)** | Cheap, visible, on-brand; makes every goal feel "read" by the system | 🟢 **Quick win** — Ten-Gods mapping + favorable-element check; one string per goal |
| **6** | **Auto-scheduling + focus-block defense** | Table-stakes vs. Motion/Reclaim; `/api/schedule` already exists; respects the no-energy-hours rule | 🟡 **Medium** — extend scheduler with defense/reschedule; quick-win for the basic version |
| **7** | **Daily shutdown / evening review** | Closure + carryover; pairs with #2; strong retention | 🟢 **Quick win** — assistant flow + carryover write-back + journal |
| **8** | **Universal quick-capture via the assistant** | Capture-anywhere; the assistant *is* the inbox; reduces friction to entry | 🟢 **Quick win** — already in spec; parse → editable chips |

**Deliberately NOT prioritized:** Notion-style blank-canvas flexibility (conflicts with 8os's opinionated archetype value); standalone habit tracker (do it as recurring tasks later, #9); any "best time of day" energy scheduling (permanently removed).

## C.3 Sequencing recommendation
Ship the **🟢 quick wins as one coherent "ritual layer"** first — daily planning (#2) → Big 3 (#3) → shutdown (#7) → weekly review (#1) → goal taglines (#5) → quick-capture (#8) — because they all reuse the existing assistant + tasks + scheduler and *immediately* showcase the BaZi phase guidance from Part A. Then take the 🟡 medium builds: BaZi-timed quarterly cycles (#4) and focus-block defense (#6).

---

## Sources
- Four Pillars of Destiny — Wikipedia: https://en.wikipedia.org/wiki/Four_Pillars_of_Destiny
- Ba Zi / Luck Pillar — Wikibooks (direction + sequence + ÷3 rule): https://en.wikibooks.org/wiki/Ba_Zi/Luck_Pillar
- OpenFate — Luck Pillar start age: https://openfate.ai/en/insights/how-to-calculate-luck-pillar-start-age
- FateMaster — Qiyun starting time: https://www.fatemaster.ai/en/guides/qiyun-starting-time
- shen-shu — 10-year luck cycle: https://www.shen-shu.com/en/blog/bazi-10-year-luck-cycle-explanation-and-knowledge-sharing
- bazi-web — Luck Pillars: https://bazi-web.com/luck-pillars-da-yun-10-year-cycles-guide/
- bazifortune — Luck Pillars guide: https://bazifortune.app/blog/luck-pillars-10-year-cycles-bazi-guide
- Nova Masters — good luck pillar / personal seasons: https://novamastersconsulting.com/how-to-tell-if-youre-in-a-good-luck-pillar-in-bazi/ , https://novamastersconsulting.com/bazi-and-timing-how-luck-pillars-affect-your-personal-seasons/
- OraDao — Liu Nian annual luck: https://www.oradao.com/blog/liu-nian-annual-luck
- URANIZE — annual pillar: https://uranize.com/en/glossary/annual-pillar
- BaziChart.ai — time dimension guide: https://bazichart.ai/en/learn/luck-pillars/
- cosmictao — Chinese calendar / BaZi: https://www.cosmictao.com/library/chinese-calendar , https://www.cosmictao.com/library/bazi
- Nova Masters — 24 solar terms: https://novamastersconsulting.com/lunar/24-solar-terms/
- Useful God / Yong Shen — bazi-web, Cantian AI, GuanWei: https://bazi-web.com/the-useful-god-yong-shen-the-most-important-element-you-need/ , https://www.cantian.ai/wiki/other_words_explanations/xiyongshen/ , https://www.guanweibazi.com/blog/yongshen-explained
- Ten Gods (Shi Shen) — bazifortune: https://bazifortune.app/blog/bazi-ten-gods-shi-shen-complete-guide
- Sunsama daily planning & shutdown: https://www.sunsama.com/features/daily-planning-and-shutdown
- Reclaim focus time: https://reclaim.ai/features/focus-time
- Motion: https://www.usemotion.com/
- Akiflow: https://akiflow.com/ , https://akiflow.com/features
- Panda Planner: https://pandaplanner.com/blogs/news/stay-organized-with-panda-planner-pro
- Best Self journal review (positiveroutines): https://positiveroutines.com/best-self-journal-review/
- Productivity planners roundup (nakishawynn): https://www.nakishawynn.com/best-productivity-planners/
