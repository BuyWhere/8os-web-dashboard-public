# 8OS — CURRENT BUILD DIRECTIVE (2026-06-25)
**READ THIS FIRST. It supersedes any older deploy/GitHub/Vercel instructions.**

## Where we are
8os.ai is **fully migrated to Railway + Cloudflare. There is NO GitHub and NO Vercel anymore — both are retired. Do not use them.**
- The dashboard (`8os-dashboard`, Next.js 14 + Prisma) is **LIVE on Railway**, serving `8os.ai` / `www` / `api` / `dash` through a Cloudflare Worker (`8os-proxy`).
- **Source of truth = the local repo on the droplet: `/home/paperclip/8os/frontend`** (and `/home/paperclip/8os/os-generator`). Edit there, commit locally, deploy from there.

## How we deploy now (the ONLY way — no `git push`, no PRs, no Vercel)
```bash
cd /home/paperclip/8os/frontend
RAILWAY_TOKEN=$RAILWAY_8OS_PROJECT_TOKEN RAILWAY_PROJECT_ID=27eb0f95-dfa8-450e-b504-4a4519a0dac6 \
  railway up --service frontend --environment production --detach --ci
```
Backend services deploy the same way with their own `--service` (orchestrator, os-generator, …).
**Never touch Railway custom-domain certs** — they get stuck `VALIDATING_OWNERSHIP` and never issue; the Cloudflare Worker handles TLS. Verify a deploy by hitting `https://8os.ai/api/health`.

## Priority
**Make the product USABLE and dogfoodable. Do NOT work on monetization/marketing plumbing yet.** The goal: a real person (Rich) signs up, gets their archetype + a live dashboard, and uses an in-built assistant daily to plan and organize their life.

## What to build now (two things)
### 1. The Dashboard (per-user, archetype-skinned, real data)
End-to-end: onboarding (birth date → BaZi → quiz → archetype) → goals → projects → tasks → calendar, all linked and live. Use the **working `os-generator` engine** (BaZi + archetype + scoring; 56 tests pass) to produce the per-user OS config, then render a real dashboard — not a marketing page.

### 2. The in-built AI Assistant (the new north star)
An always-on conversational assistant embedded in the dashboard that the user **talks to** to plan, schedule, and organize everything in their OS. This is the evolution of the old drift/coaching engine + Telegram briefing into a full assistant.
- **Powered by Flow AI's API** (`https://api.flowaiapi.com`, OpenAI/Anthropic-compatible) — this is our own inference product; use it for all assistant LLM calls.
- It should read/write the user's goals/projects/tasks/calendar (via the tools below) and proactively help.

## Open-source tools (per the original plan — self-host on Railway)
- **tududi** (`chrisvel/tududi`, Docker) — tasks / projects / areas. Tudor owns the bridge (OS config → tududi).
- **Cal.com / Cal.diy** — scheduling / calendar blocks. Cal owns integration.
- These back the dashboard's task + calendar surfaces; the assistant manipulates them via their APIs.

## The plans still exist — read them before starting
- **OS-2** — OS architecture & tech stack (ADR)
- **OS-27** — day-by-day build plan (the original execution guideline)
- **OS-89** — Wave-2 production MVP (100+ subtasks: try-now flow, BaZi, quiz, goals→projects→tasks→calendar, insights)
- **OS-93 / OS-129 / OS-138 / OS-180** — dashboard core layout, layout architecture, archetype skins
- **OS-22** — drift detection & coaching engine (now folds into the assistant)
- Repo docs: `/home/paperclip/8os/frontend/docs/caldiy-integration-plan.md`, `docs/archie-engine.md`

## Team
- **Alex (CTO)** owns execution; **Orion** orchestration/AI; **Vex** dashboard frontend; **Archie** OS-generator; **Drake** intelligence→assistant; **Tudor** tududi; **Cal** Cal.com; **Daisy** design; **Quinn** QA; **Sentry** reliability.
- Marketing (Heidi/Mira) keeps running separately — engineering's job is the product.
