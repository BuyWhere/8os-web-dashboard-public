# OS-6161 heartbeat handoff — 2026-09-04T22:40Z

## Problem confirmed

Live probes before this heartbeat confirmed `https://api.8os.ai/api/health` returned 200 while product-surface routes served by the FastAPI orchestrator returned 404:

- `/api/products`
- `/api/tasks`
- `/api/coach/plays`
- `/api/calendar`
- `/api/journal`
- `/api/methodology`
- `/api/generate`

This matches OS-6161: the orchestrator deployment does not expose or forward Next.js-owned product routes.

## Work completed locally

Updated `backend/app/main.py` to add a thin Next.js product-surface proxy for `api.8os.ai`:

- `/api/products`, `/api/products/{id}`
- `/api/tasks` plus detail, reschedule, snooze, and quick-capture routes
- `/api/coach/plays`
- `/api/calendar` and calendar event routes
- `/api/journal` plus extract/apply
- `/api/generate`
- Catch-all fallback for other unowned `/api/{full_path}` routes

Existing orchestrator-owned `/api/health` and alignment summary/tool-spec behavior remain in FastAPI. Alignment tool-call now uses the shared proxy helper.

Also adjusted the untracked product catalog scaffold:

- `src/app/api/products/route.ts` now asks Stripe to `expand: ['data.product']` instead of trying to list products by ids.
- `src/app/api/products/[id]/route.ts` uses synchronous App Router params typing.

## Verification run

Passed:

```bash
python3 -m py_compile backend/app/main.py
PYTHONPATH=backend python3 - <<'PY'
from app.main import app
for r in app.routes:
    p = getattr(r, 'path', None)
    if p and (p.startswith('/api/products') or p.startswith('/api/tasks') or p.startswith('/api/coach') or p.startswith('/api/calendar') or p.startswith('/api/journal') or p.startswith('/api/generate') or p == '/api/{full_path:path}'):
        print(p, sorted(getattr(r, 'methods', []) or []))
PY
npx jest src/app/api/waitlist/__tests__/route.test.ts --runInBand
```

The Jest suite passed 11/11 with the pre-existing haste warning from `.next/standalone/package.json` duplicating the root package name.

Repo-wide TypeScript still fails on unrelated pre-existing errors in generated `.next/types`, `flow-ai`, Clerk auth types, `archie-engine`, etc. No full build/typecheck success should be claimed until those are resolved or a clean build environment is used.

## Remaining

Deploy the current branch/workspace to the Railway orchestrator service, then re-probe `https://api.8os.ai` product routes. Expected post-deploy behavior is no FastAPI `{"detail":"Not Found"}` for Next.js-owned product surfaces; public routes should proxy through, and authed routes should return the same 401/403/405/etc. responses as the Next.js app instead of 404.

## Control-plane note

Attempts to PATCH OS-6161 assignment/status and to post a structured progress comment through the Paperclip API failed in this heartbeat. The API rejected the run context / structured metadata, so status may not reflect this local progress. Per heartbeat contract, retries were stopped after repeated control-plane write failures.

# OS-6161 heartbeat update — 2026-09-05T01:45Z

## Live reproduction

Live probes still reproduce the production regression on `https://api.8os.ai`:

- `GET /health` → 200
- `GET /api/products` → 404
- `GET /api/products/test` → 404
- `POST /api/products` → 404
- `GET /api/alignment` → 200
- `GET /api/alignment/tool-spec` → 200
- `POST /api/alignment/tool-call` → 404

This confirms the deployed Railway orchestrator is still missing the product proxy/tool-call surface; the local fix has not reached production.

## Local verification repeated

Re-ran the targeted checks from this workspace:

```bash
python3 -m py_compile backend/app/main.py
PYTHONPATH=backend python3 - <<'PY'
from app.main import app
for r in app.routes:
    p = getattr(r, 'path', None)
    if p and (p.startswith('/api/products') or p.startswith('/api/tasks') or p.startswith('/api/coach') or p.startswith('/api/calendar') or p.startswith('/api/journal') or p.startswith('/api/generate') or p in ('/api/alignment/tool-call', '/api/{full_path:path}')):
        print(p, sorted(getattr(r, 'methods', []) or []))
PY
npx jest src/app/api/waitlist/__tests__/route.test.ts --runInBand
```

Results:

- `backend/app/main.py` compiles.
- FastAPI route introspection shows `/api/products`, `/api/tasks`, `/api/coach/plays`, `/api/calendar`, `/api/journal`, `/api/generate`, `/api/alignment/tool-call`, and `/api/{full_path:path}` registered locally.
- Targeted Jest suite passes: `src/app/api/waitlist/__tests__/route.test.ts` 11/11.

## Deploy blocker found

Attempted the smallest deploy-path check:

```bash
railway status
RAILWAY_TOKEN="$RAILWAY_8OS_PROJECT_TOKEN" railway status
```

Both fail with `Invalid RAILWAY_TOKEN. Please check that it is valid and has access to the resource you're trying to use.`

## Remaining

The code path is locally verified but production still returns 404. A deploy owner with a valid Railway token must deploy this workspace/branch to the `api.8os.ai` orchestrator service, then re-run the live probes above and close OS-6161 only when `/api/products` and `/api/alignment/tool-call` no longer return FastAPI 404.

# OS-6161 heartbeat update — 2026-09-05T04:48:12Z

## Live production state

Re-probed `https://api.8os.ai` from this heartbeat. The regression is still live in production:

| Route | Result |
| --- | --- |
| `GET /health` | 200 |
| `GET /api/health` | 200 |
| `GET /api/products` | 404 `{"detail":"Not Found"}` |
| `GET /api/products/test` | 404 `{"detail":"Not Found"}` |
| `POST /api/products` | 404 `{"detail":"Not Found"}` |
| `GET /api/tasks` | 404 `{"detail":"Not Found"}` |
| `GET /api/coach/plays` | 404 `{"detail":"Not Found"}` |
| `GET /api/calendar` | 404 `{"detail":"Not Found"}` |
| `GET /api/journal` | 404 `{"detail":"Not Found"}` |
| `GET /api/methodology` | 404 `{"detail":"Not Found"}` |
| `POST /api/generate` | 404 `{"detail":"Not Found"}` |
| `GET /api/alignment` | 200 |
| `GET /api/alignment/tool-spec` | 200 |
| `POST /api/alignment/tool-call` | 404 `{"detail":"Not Found"}` |

## Local work completed

Added a FastAPI pass-through for the Next.js-owned product surface in `backend/app/main.py`:

- Explicit `/api/alignment/tool-call` proxy route, so the health probe can verify it is registered.
- Catch-all `/api/{full_path:path}` proxy for the OS-6161 surfaces: `/api/products`, `/api/tasks`, `/api/coach/*`, `/api/calendar`, `/api/journal`, `/api/methodology`, and `/api/generate`.
- Proxy preserves request method/body/query and non-hop-by-hop headers, returns upstream status/content/headers, and emits 502 if the Next.js upstream is unavailable.
- Added optional `NEXT_API_ORIGIN` in `backend/app/config.py`; defaults to `FRONTEND_URL` / `https://www.8os.ai` for production compatibility.

## Verification

Passed:

```bash
python3 -m py_compile backend/app/main.py backend/app/config.py
PYTHONPATH=backend python3 -c "from app.main import app; print([getattr(r, 'path', None) for r in app.routes if getattr(r, 'path', None) in ('/api/alignment/tool-call','/api/{full_path:path}')])"
```

Route introspection confirms local registration of:

- `/api/alignment/tool-call` for DELETE/GET/OPTIONS/PATCH/POST/PUT
- `/api/{full_path:path}` for DELETE/GET/OPTIONS/PATCH/POST/PUT

## Remaining / blocker

Production still needs a Railway deploy of this workspace/branch to `api.8os.ai`. Prior deploy-path checks in this issue show both `railway status` and `RAILWAY_TOKEN="$RAILWAY_8OS_PROJECT_TOKEN" railway status` fail with invalid token, and OS-1746 is the active deploy-credential blocker. After OS-1746 is resolved, deploy and re-probe the table above; OS-6161 should close only after `/api/products` and `/api/alignment/tool-call` no longer return FastAPI 404.
