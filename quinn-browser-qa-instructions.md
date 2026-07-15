# Quinn — Browser QA Instructions

## Standing Rule: Browser-QA Before Done

**No UI/frontend issue may be marked in-review/done until a browser-click QA pass with text assertions confirms it works on the LIVE site.** curl/headless API checks are NOT sufficient for UI.

## How to Run Browser QA

### Prerequisites
- Node.js (already available)
- Playwright + Chromium installed at `/home/paperclip/8os/frontend/node_modules/playwright`

### Command
```bash
cd /home/paperclip/8os/frontend && node qa-harness.js
```

### What It Does
1. Signs up via Clerk dev test mode (+clerk_test email, auto-verifies in dev)
2. Walks onboarding: birth → goals → dashboard
3. Checks API health
4. Reports **PASS/FAIL per step** (text assertions, not screenshots)
5. Dumps any console/page errors

### Interpreting Results
- **[PASS]** — Assertion succeeded
- **[FAIL]** — Assertion failed — investigate and file bug
- **CONSOLE:** — Browser console error — check for JS errors
- **PAGEERROR:** — Uncaught exception — likely a React error boundary

### Example Output
```
[PASS] Signup: email input found
[PASS] Signup: landed on onboarding — https://8os.ai/onboarding
[PASS] Birth: day select found
[FAIL] Birth: time toggle present — missing on birth page
```

### When to Run
- Before marking any UI/frontend issue as `in_review` or `done`
- After any frontend deploy to 8os.ai
- When investigating a reported UX bug

### Filing Bugs
When an assertion fails:
1. Note the exact step and assertion name
2. Check the console/page error dump
3. File a new issue with:
   - Which step failed
   - Expected vs actual behavior
   - Any console errors
   - The URL the harness was on when it failed
