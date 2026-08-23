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

# The demo student's password is no longer written anywhere in the repository
# (it used to be one fixed string in a dozen files and on the sign-in page).
# The suite still has to sign in as that account, so it makes up a new one for
# this run, puts it on the account, and hands it to every script through the
# environment. Nothing to leak, and no fixed value for the next reader to reuse.
export DEMO_STUDENT_PASSWORD="Verify-$(node -e "console.log(require('crypto').randomBytes(9).toString('base64url'))")"
node scripts/accounts.js reset-student "$DEMO_STUDENT_PASSWORD" >/dev/null 2>&1 \
  || note "could not reset the demo student — the account may not exist in this database"

# The administrator is the same story, with one difference: an ADMIN_PASSWORD you
# have already set is KEPT. Running the test suite must not quietly change the
# password you use to sign in. Only when there is none does it make one up, reset
# the account and say so — otherwise the admin steps could not sign in at all.
if [ -z "${ADMIN_PASSWORD:-}" ]; then
  export ADMIN_PASSWORD="Verify-$(node -e "console.log(require('crypto').randomBytes(9).toString('base64url'))")"
  node scripts/accounts.js reset-admin "$ADMIN_PASSWORD" >/dev/null 2>&1 \
    && note "administrator password reset for this run: $ADMIN_PASSWORD" \
    && note "(export ADMIN_PASSWORD before running to keep your own)"
fi

step "The gate's own machinery (retry, worker pool, CSRF warm-up)"
node scripts/test-harness.mjs || fail=1

step "Async discipline (every query awaited, every router wrapped)"
node scripts/test-async.mjs || fail=1

step "Cloud Storage driver (RS256 assertion, token cache, GCS request shapes)"
node scripts/test-gcs.mjs || fail=1

step "S3 driver (SigV4 against AWS's worked example, task-role credentials)"
node scripts/test-s3.mjs || fail=1

step "Secrets Manager (fetch, merge, and nothing captured at import time)"
node scripts/test-secrets.mjs || fail=1

step "Google Classroom (sealed grant, token renewal, courses and rosters)"
node scripts/test-classroom.mjs || fail=1

step "Server-side analytics (identity, payload rules, nothing personal)"
node scripts/test-analytics.mjs || fail=1

step "PostgreSQL schema (step one of the move off SQLite)"
# Best effort: start a throwaway cluster when this machine has the binaries.
# The check needs a REAL server — a translation that merely looks right is what
# it exists to catch — but a laptop without PostgreSQL must still be able to run
# the suite, so a failure here is a loud skip inside the test, not a red gate.
if [ -z "${PG_URL:-}" ]; then
  eval "$(bash scripts/pg-dev.sh 2>/dev/null)" || true
fi
node scripts/test-pg-schema.mjs || fail=1

step "Backup and restore (live snapshot, corrupt archive refused, pruning cannot empty the store)"
node scripts/test-backup.mjs || fail=1

step "Account rescue"
node scripts/test-accounts.js || fail=1

step "Outgoing mail (composition, SMTP conversation, no token in the log)"
node scripts/test-mail.mjs || fail=1

step "Admin second factor (RFC 6238 vectors, enrolment, sign-in)"
node scripts/test-totp.mjs || fail=1

step "Start the server"
pkill -f 'node server\.js' 2>/dev/null || true
sleep 0.5
# The suite signs in wrongly on purpose several times a run — proving that a
# refused sign-in says the same thing whether or not the account exists. Five of
# those against one key is a 15-minute lockout, and since 2026-08-12 the lockout
# lives in the DATABASE rather than in process memory, so it now SURVIVES between
# runs and accumulates. Running the gate a few times in a quarter of an hour then
# turns a 401 into a 429 and the suite goes red for a reason that has nothing to
# do with the code. Same family as the three env ceilings raised below; the fix
# is the same shape — start each run from a known throttle state, in this test
# database only. Nothing in the product clears these.
# Everything the test database needs before the server starts. In a FILE, not
# a `node -e "…"`: the shell ate the quotes and the backticks of the version
# that lived here, and `2>/dev/null || true` meant it failed in silence.
# Allowed to fail without stopping the run — a fresh database has no demo
# student yet — but it says so now instead of pretending.
node scripts/gate-setup.mjs || note "gate setup did not complete; later steps may fail"
# Both the suite and the screenshot step register accounts from 127.0.0.1, so
# production's 5-per-hour ceiling would have a later step blocked by an earlier
# one — red because of ordering, not because of a real fault. Same for the
# forgotten-password ceiling: each run asks for one reset link, and 5 per hour
# means the suite cannot run six times in an hour — exactly what somebody chasing
# a flaky test does. Same again for code redemption: 12 per 10 minutes, one per run.
# These are all three of the time-window limits the suite passes through (see
# docs/SECURITY.md §2); raise them here only, never in the source.
# A throwaway sealing key for this run, so the marking suite can store one at all.
# Never a fixed value: a key written into a repository is not a key.
export TOKEN_ENCRYPTION_KEY="${TOKEN_ENCRYPTION_KEY:-$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")}"
# The sign-in lockout is deliberately NOT raised here. It is keyed on IP ×
# username, so the deliberate wrong passwords in the suite land on their own
# throwaway names and never accumulate against a name a later step needs. And
# scripts/test-user-api.mjs drives that lockout on purpose and asserts the 429:
# raising the ceiling for the gate would quietly delete the check that the
# lockout works at all.
# WRITE_PER_MIN is the fourth ceiling raised for the gate, and the newest.
# It is 300 writes a minute keyed on the session cookie — generous for a person
# and not for a test suite, which is ONE session doing hundreds of writes back
# to back. Blocks 3.5 to 6 added four suites' worth of registrations, drills,
# revision sets and marking, and the admin suite started meeting a 429 on a
# sign-in POST: the browser simply stayed on the sign-in page, the suite threw
# "the admin session was not accepted", and — because it threw before its
# cleanup section — it left a published test paper behind that made test-items
# fail too. One limit, two red steps, neither of them about the code.
# Raised here only, never in the source, same as the three above.
REGISTER_PER_HOUR=200 FORGOT_PER_HOUR=200 REDEEM_PER_10MIN=200 WRITE_PER_MIN=5000 node server.js > /tmp/prep-verify-server.log 2>&1 &
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

step "Lifecycle and health (crash exits non-zero, SIGTERM drains, /healthz)"
node scripts/test-health.mjs || fail=1

step "Serving and tuning (a cached page still mints a fresh nonce; SQLite pragmas)"
node scripts/test-serving.mjs || fail=1

step "Admin API"
node scripts/test-admin.mjs || fail=1

step "Student journey"
node scripts/test-auth.mjs || fail=1

step "Student catalogue (/api/catalog)"
node scripts/test-catalog.mjs || fail=1

step "Placement (the gate is a URL rule, and eighteen answers must reach skill_events)"
node scripts/test-placement.mjs || fail=1

step "Drills (chosen from the ability report, and fed back into it)"
node scripts/test-drills.mjs || fail=1

step "Revision (a fair gap marker, and grammar that must not reach the band)"
node scripts/test-revision.mjs || fail=1

step "The weekly plan (three things, all real, ranked by the same model)"
node scripts/test-plan.mjs || fail=1

step "Ability model (the maths by hand, a re-mark that must not double, the dashboard)"
node scripts/test-ability.mjs || fail=1

step "Student account API"
node scripts/test-user-api.mjs || fail=1

step "Exam engine (sittings, timers, replays, quotas)"
node scripts/test-exam.mjs || fail=1

# A browser, because the API cannot see this: whether the Part B passage is on
# the screen or gone, every request and response is identical.
step "The exam screen (Part B hides its passage)"
node scripts/test-exam-ui.mjs || fail=1

# Also a browser, and for the same reason: whether the chip rail can be dragged
# is invisible to every request the server sees.
step "The self-study chip rail (arrows, dragging, and not opening a lesson by accident)"
node scripts/test-navscroll.mjs || fail=1

step "VPET item bank (blueprint match, per-item quality)"
node scripts/test-items.mjs || fail=1

# After the exam engine, because that suite publishes a fixture paper and
# archives it again on the way out — this one checks every paper still
# published, and a fixture left behind is one of the things it is here to catch.
step "The paper a candidate sits (parts, counts, no part sharing another's items)"
node scripts/test-paper.mjs || fail=1

# Needs a TOKEN_ENCRYPTION_KEY to store a key at all, and the suite stands up its
# own stub model on loopback - no real account, no network, no cost.
step "Marking writing and speaking (the key, the rubric pass, what a candidate sees)"
node scripts/test-ai-marking.mjs || fail=1

# Straight after the marking suite on purpose: both install a stub model as the
# marker, and the one that runs last leaves its own stub configured. Adjacent,
# neither can be surprised by the other's leftovers.
step "The rubric (caps that fire for the right reason, a quotation that must be real)"
node scripts/test-rubric.mjs || fail=1

step "Payments (gateway signatures, settlement rules, one code per order)"
node scripts/test-payments.mjs || fail=1

step "Security (headers, write limit, per-endpoint guards)"
node scripts/test-security.mjs || fail=1

step "Vocabulary (schema, importer, lookup by inflected form)"
node scripts/test-vocab.mjs || fail=1

step "Self-study area (verbs, linking words, nine grammar groups, eleven pages)"
node scripts/test-learn.mjs || fail=1

step "Spaced repetition (SM-2 schedule, review queue)"
node scripts/test-srs.mjs || fail=1

step "Interface audit (overflow, contrast, CSP)"
# In Vietnamese on purpose: that is what a visitor gets, and Vietnamese runs
# longer than the English it replaces, so this is the run that catches a label
# overflowing its button. The functional tests pin English (see _browser.mjs).
PREP_TEST_LANG=vi node scripts/audit.mjs || fail=1

if [ "${SKIP_SHOTS:-0}" != "1" ]; then
  step "Acceptance screenshots"
  # Also Vietnamese: these images are the record of what the product looks like.
  PREP_TEST_LANG=vi node scripts/screenshot.mjs || fail=1
  PREP_TEST_LANG=vi node scripts/shot-admin.mjs || fail=1
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
