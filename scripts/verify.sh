#!/usr/bin/env bash
# The whole suite in one command — for the autonomous session and for people.
# Installs dependencies if missing, starts and stops the server, exits non-zero on red.
set -uo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
fail=0
# Time each step. The suite once passed fifteen minutes with nobody able to say
# which part ate them, because the log did not say. Printed, the next slow step tells on itself.
STEP_T0=0
STEP_NAME=''
declare -a STEP_TIMES=()
_close_step() {
  [ -z "$STEP_NAME" ] && return 0
  STEP_TIMES+=("$(( SECONDS - STEP_T0 ))s  $STEP_NAME")
  STEP_NAME=''
}
step() {
  _close_step
  STEP_NAME="$1"; STEP_T0=$SECONDS
  printf '\n\033[1m== %s ==\033[0m\n' "$1"
}
note() { printf '   %s\n' "$1"; }

step "Dependency"
if [ ! -d node_modules ] || [ ! -d node_modules/express ]; then
  note "node_modules missing, installing…"
  npm install --no-audit --no-fund || { echo "npm install FAILED"; exit 1; }
else
  note "node_modules already present"
fi

step "Build CSS"
npm run build || fail=1

step "Account rescue"
node scripts/test-accounts.js || fail=1

step "Start the server"
pkill -f 'node server\.js' 2>/dev/null || true
sleep 0.5
# Both the suite and the screenshot step register accounts from 127.0.0.1, so
# production's 5-per-hour ceiling would have a later step blocked by an earlier
# one — red because of ordering, not because of a real fault. Same for the
# forgotten-password ceiling: each run asks for one reset link, and 5 per hour
# means the suite cannot run six times in an hour — exactly what somebody chasing
# a flaky test does. Same again for code redemption: 12 per 10 minutes, one per run.
# These are all three of the time-window limits the suite passes through (see
# docs/SECURITY.md §2); raise them here only, never in the source.
REGISTER_PER_HOUR=200 FORGOT_PER_HOUR=200 REDEEM_PER_10MIN=200 node server.js > /tmp/prep-verify-server.log 2>&1 &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT

for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://localhost:$PORT/prep/landing/"; then break; fi
  sleep 0.5
done
if ! curl -fsS -o /dev/null "http://localhost:$PORT/prep/landing/"; then
  echo "Server would not start. Log:"; tail -20 /tmp/prep-verify-server.log; exit 1
fi
note "server ready on port $PORT"

step "Admin API"
node scripts/test-admin.mjs || fail=1

step "Student journey"
node scripts/test-auth.mjs || fail=1

step "Student catalogue (/api/catalog)"
node scripts/test-catalog.mjs || fail=1

step "Student account API"
node scripts/test-user-api.mjs || fail=1

step "Exam engine (sittings, timers, replays, quotas)"
node scripts/test-exam.mjs || fail=1

step "VPET item bank (blueprint match, per-item quality)"
node scripts/test-items.mjs || fail=1

step "Security (headers, write limit, per-endpoint guards)"
node scripts/test-security.mjs || fail=1

step "Vocabulary (schema, importer, lookup by inflected form)"
node scripts/test-vocab.mjs || fail=1

step "Self-study area (verbs, linking words, nine grammar groups, eleven pages)"
node scripts/test-learn.mjs || fail=1

step "Interface audit (overflow, contrast, CSP)"
node scripts/audit.mjs || fail=1

if [ "${SKIP_SHOTS:-0}" != "1" ]; then
  step "Acceptance screenshots"
  node scripts/screenshot.mjs || fail=1
  node scripts/shot-admin.mjs || fail=1
fi

_close_step
printf '\n\033[1m== Time per step ==\033[0m\n'
printf '   %s\n' "${STEP_TIMES[@]}"
printf '   %ss  TOTAL\n' "$SECONDS"

printf '\n'
if [ "$fail" -eq 0 ]; then
  printf '\033[1;32m✔ All steps green.\033[0m\n'
else
  printf '\033[1;31m✗ A step failed — see the log above.\033[0m\n'
fi
exit "$fail"
