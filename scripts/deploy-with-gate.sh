#!/usr/bin/env bash
# 8os pre-deploy smoke gate — promote to 8os.ai ONLY if a candidate build
# passes the smoke probe first. Closes OS-1221 (the second time in five
# hours Vex shipped a build that broke /coming-soon or /api/auth/google
# on 8os.ai — see parent issue OS-1219).
#
# Why a gate, not just a post-deploy check:
#   - A post-deploy smoke probe flags the regression, but production is
#     already broken by then. The CEO had to do two manual rollbacks
#     (00:53Z, 03:05Z) for the same root cause in one day.
#   - This script deploys to a *preview* URL Vercel assigns to the
#     candidate build, runs the smoke probe against that URL, and only
#     assigns the production alias (8os.ai) when every probe passes.
#   - A failed probe aborts the promotion; the candidate URL is left
#     alive for debugging but never serves 8os.ai traffic.
#
# Flow:
#   1. Sanity checks (vercel CLI, env vars, working dir).
#   2. `vercel deploy --yes` (NO --prod) → captures the candidate URL.
#   3. Wait for the candidate to be reachable (poll /api/health, max 90s).
#   4. Run smoke-probe-8os.sh --base-url $CANDIDATE_URL --skip-orchestrator
#      --json. The candidate URL is the web-dashboard preview, not the
#      orchestrator, so orchestrator-direct probes (api.8os.ai) are out
#      of scope for the gate.
#   5. On PASS: `vercel alias` the candidate URL to the production
#      domain (8os.ai by default). Print deploy URL, return 0.
#   6. On FAIL: print "DO NOT PROMOTE" banner with the failing probe
#      detail, do NOT alias. Return non-zero so a CI shell bails.
#
# Usage:
#   scripts/deploy-with-gate.sh                          # promote to 8os.ai
#   scripts/deploy-with-gate.sh --alias 8os.ai          # explicit (default)
#   scripts/deploy-with-gate.sh --alias preview.8os.dev  # promote to preview alias
#   scripts/deploy-with-gate.sh --dry-run                # deploy + probe, do NOT alias
#   scripts/deploy-with-gate.sh --skip-build             # skip the local npm run build
#   scripts/deploy-with-gate.sh --token "$VERCEL_API_TOKEN" --project-id prj_xxx
#
# Required env (or flags):
#   VERCEL_API_TOKEN    — team API token (sourced from Paperclip harness
#                         secrets when the agent runs the script)
#   VERCEL_PROJECT_ID   — defaults to prj_ra28Zh8IoehysZsknj1j7DKbqbBw
#                         (Vercel project "8os"; see memory
#                         [[8os-vercel-deploy-gotcha]] — must NOT use
#                         web-dashboard's prj_KVl3XTGkIRsCgYuSiwQd3mrtYPti)
#
# Reference: OS-1221 (this script), OS-1219 (parent: regression report),
#           OS-1211 (reconcile branch — canonical production branch),
#           OS-509 (predecessor runbook — DEPLOY.md).

set -u
set -o pipefail

# --- arg parsing ----------------------------------------------------------

ALIAS="8os.ai"
DRY_RUN=0
SKIP_BUILD=0
PROJECT_ID="${VERCEL_PROJECT_ID:-prj_ra28Zh8IoehysZsknj1j7DKbqbBw}"
TOKEN="${VERCEL_API_TOKEN:-}"
PROBE_ATTEMPTS=3   # slightly higher than production-probe default of 2;
                   # candidate builds can be cold-starting.
HEALTH_TIMEOUT=90  # seconds to wait for the candidate to be reachable

for arg in "$@"; do
  case "$arg" in
    --alias)         ALIAS="${2:?missing arg}"; shift 2 ;;
    --alias=*)       ALIAS="${arg#*=}"; shift ;;
    --dry-run)       DRY_RUN=1; shift ;;
    --skip-build)    SKIP_BUILD=1; shift ;;
    --token)         TOKEN="${2:?missing arg}"; shift 2 ;;
    --token=*)       TOKEN="${arg#*=}"; shift ;;
    --project-id)    PROJECT_ID="${2:?missing arg}"; shift 2 ;;
    --project-id=*)  PROJECT_ID="${arg#*=}"; shift ;;
    --attempts)      PROBE_ATTEMPTS="${2:?missing arg}"; shift 2 ;;
    --attempts=*)    PROBE_ATTEMPTS="${arg#*=}"; shift ;;
    -h|--help)
      sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "FATAL: unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# --- sanity checks --------------------------------------------------------

if ! command -v vercel >/dev/null 2>&1; then
  echo "FATAL: vercel CLI not in PATH (run \`npm i -g vercel\` and re-export PATH)" >&2
  exit 2
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "FATAL: curl not in PATH" >&2
  exit 2
fi
if [[ -z "$TOKEN" ]]; then
  echo "FATAL: VERCEL_API_TOKEN is empty (export it or pass --token)" >&2
  exit 2
fi
if [[ "$PROJECT_ID" != "prj_ra28Zh8IoehysZsknj1j7DKbqbBw" ]]; then
  echo "WARN: PROJECT_ID is $PROJECT_ID, not the canonical 8os prj_ra28Zh8IoehysZsknj1j7DKbqbBw" >&2
  echo "      (see memory [[8os-vercel-deploy-gotcha]] — wrong project causes wrong-branch regression)" >&2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROBE="$SCRIPT_DIR/smoke-probe-8os.sh"
if [[ ! -x "$PROBE" ]]; then
  echo "FATAL: smoke probe not found / not executable: $PROBE" >&2
  exit 2
fi

banner() { printf '\n=== %s ===\n' "$*"; }

# --- step 1: pre-deploy checklist -----------------------------------------

banner "Step 1/5: pre-deploy checklist"
pwd
vercel project ls --token "$TOKEN" 2>&1 | head -10 || true
if [[ "$PROJECT_ID" == "prj_ra28Zh8IoehysZsknj1j7DKbqbBw" ]]; then
  vercel env ls production --token "$TOKEN" 2>&1 | head -5 || true
fi
if (( SKIP_BUILD == 0 )); then
  if [[ -f package.json ]]; then
    echo "→ running npm run build (skip with --skip-build)"
    if ! npm run build >/tmp/deploy-gate-build.log 2>&1; then
      echo "FATAL: local build failed; refusing to deploy. See /tmp/deploy-gate-build.log" >&2
      tail -40 /tmp/deploy-gate-build.log >&2
      exit 2
    fi
  else
    echo "→ no package.json; skipping local build"
  fi
else
  echo "→ --skip-build set; trusting the prior build"
fi

# --- step 2: deploy to preview -------------------------------------------

banner "Step 2/5: vercel deploy --yes (no --prod)"
echo "→ deploying to project $PROJECT_ID (alias will be assigned after gate passes)"
DEPLOY_LOG=/tmp/deploy-gate-deploy.log
if ! vercel deploy --yes --token "$TOKEN" --project "$PROJECT_ID" >"$DEPLOY_LOG" 2>&1; then
  echo "FATAL: vercel deploy failed. See $DEPLOY_LOG" >&2
  tail -40 "$DEPLOY_LOG" >&2
  exit 2
fi
tail -30 "$DEPLOY_LOG"

# `vercel deploy` (without --prod) prints the candidate preview URL near
# the end of its output, like:
#   ✅  Preview: https://web-dashboard-abc123-username.vercel.app [copied to clipboard]
# or (older CLI):
#   Production: https://web-dashboard-abc123-username.vercel.app
# We accept either "Preview:" or "Production:" since the line is the same
# identifier for the deployment's URL — the distinction is just labeling.
# We exclude lines that contain "8os.ai" so we never alias a candidate
# URL that's already pointing at the production domain (defensive: an
# earlier CI run that promoted via a different route would leave the
# URL already aliased, and we don't want to re-alias it).
CANDIDATE_URL=$(grep -Eo 'https?://[^ ]*\.vercel\.app' "$DEPLOY_LOG" \
  | grep -v '8os\.ai' \
  | tail -1 || true)

if [[ -z "$CANDIDATE_URL" ]]; then
  echo "FATAL: could not parse candidate URL from vercel deploy output." >&2
  echo "       (looked for 'https://...vercel.app' in $DEPLOY_LOG)" >&2
  tail -20 "$DEPLOY_LOG" >&2
  exit 2
fi
echo "→ candidate URL: $CANDIDATE_URL"

# --- step 3: wait for candidate to be reachable ---------------------------

# The 8os Vercel project (prj_ra28Zh8IoehysZsknj1j7DKbqbBw) has
# ssoProtection.deploymentType=all_except_custom_domains, so the candidate
# URL (https://8os-<hash>-<team>.vercel.app) is behind Vercel SSO and
# /api/health returns 401 without the automation-bypass header. The
# bypass header is the right tool for CI/agent previews — see OS-1239 /
# OS-1243. Allow override via env so we can rotate the secret without
# editing this script.
VERCEL_PROTECTION_BYPASS="${VERCEL_PROTECTION_BYPASS:-imKa3ZavxXlLvcux1rGYELOGdVWjZyaw}"
health_curl=(curl -s -m 5 -o /dev/null -w "%{http_code}"
             -H "x-vercel-protection-bypass: $VERCEL_PROTECTION_BYPASS"
             "$CANDIDATE_URL/api/health")

banner "Step 3/5: wait for candidate $CANDIDATE_URL to be reachable (max ${HEALTH_TIMEOUT}s)"
elapsed=0
ready=0
while (( elapsed < HEALTH_TIMEOUT )); do
  if code=$("${health_curl[@]}" 2>/dev/null); then
    if [[ "$code" == "200" ]]; then
      ready=1
      break
    fi
  fi
  sleep 2
  elapsed=$((elapsed + 2))
  printf "  [%3ds] waiting on /api/health …\n" "$elapsed"
done
if (( ready == 0 )); then
  echo "FATAL: candidate $CANDIDATE_URL did not respond on /api/health within ${HEALTH_TIMEOUT}s" >&2
  echo "       skipping probe; the candidate is left alive at the URL above for debugging." >&2
  exit 1
fi
echo "→ candidate is up (200 on /api/health after ${elapsed}s)"

# --- step 4: smoke probe against the candidate ---------------------------

banner "Step 4/5: smoke probe against $CANDIDATE_URL"
PROBE_JSON=/tmp/deploy-gate-probe.json
set +e
# Pass the Vercel automation-bypass secret to the smoke probe so the
# candidate-URL probes (which hit the same SSO-protected host as step 3)
# aren't all 401'd. The secret was already used in step 3 to wait for
# /api/health. See OS-1239 / OS-1243.
"$PROBE" --base-url "$CANDIDATE_URL" --skip-orchestrator \
  --bypass-secret "$VERCEL_PROTECTION_BYPASS" \
  --attempts "$PROBE_ATTEMPTS" --json >"$PROBE_JSON" 2>&1
probe_rc=$?
set -e
cat "$PROBE_JSON"
echo
if (( probe_rc != 0 )); then
  echo
  banner "ABORT: smoke probe FAILED on candidate $CANDIDATE_URL (rc=$probe_rc)"
  echo "  → production alias 8os.ai has NOT been assigned." >&2
  echo "  → candidate is left alive at the URL above for debugging." >&2
  echo "  → fix the regression on the candidate branch and re-run." >&2
  exit $probe_rc
fi

# --- step 5: promote (or dry-run) -----------------------------------------

banner "Step 5/5: promote candidate to $ALIAS"
if (( DRY_RUN == 1 )); then
  echo "DRY-RUN: would run: vercel alias $CANDIDATE_URL $ALIAS --token \$TOKEN --project $PROJECT_ID"
  echo "→ candidate URL: $CANDIDATE_URL"
  echo "→ target alias:  $ALIAS"
  echo "→ smoke probe:   PASS"
  echo "→ no alias assigned (dry-run)"
  exit 0
fi

echo "→ vercel alias $CANDIDATE_URL $ALIAS"
if ! vercel alias "$CANDIDATE_URL" "$ALIAS" --token "$TOKEN" --project "$PROJECT_ID" >/tmp/deploy-gate-alias.log 2>&1; then
  echo "FATAL: vercel alias failed. See /tmp/deploy-gate-alias.log" >&2
  tail -20 /tmp/deploy-gate-alias.log >&2
  exit 1
fi
tail -5 /tmp/deploy-gate-alias.log

banner "DONE"
echo "  candidate URL: $CANDIDATE_URL"
echo "  promoted to:   https://$ALIAS"
echo "  smoke probe:   PASS"
echo "  8os.ai live at: https://$ALIAS"
exit 0
