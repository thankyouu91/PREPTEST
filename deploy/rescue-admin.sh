#!/usr/bin/env bash
# "Nobody can sign in to the admin area." Run this on the server.
#
# It exists because the hard part was never the reset — it was finding WHICH
# database to reset. The app's database is `PREP_DB`, or `<working
# directory>/data/prep.sqlite` when that is unset, so two checkouts on one
# machine are two databases and nothing tells you which one the live site has
# open. Resetting the wrong one reports success and changes nothing, and the
# symptom is a 401 with the password you just set — which sends you looking at
# the password.
#
# So this asks the running process instead of guessing: /proc/<pid>/fd lists
# the file it really has open, whatever the configuration appears to say.
#
#   sudo bash deploy/rescue-admin.sh                 # generate one, print once
#   sudo bash deploy/rescue-admin.sh 'MyPassw0rd12'  # or choose it
#
# It also works pasted whole into Systems Manager → Run Command, which needs no
# SSH, no key and no terminal — see the README.
set -euo pipefail

WANTED="${1:-}"

say() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

say "Finding the running server"
# argv[0] has to BE node. Matching the whole command line instead catches the
# shell that launched it — its -c argument contains "server.js" too — and then
# /proc/<pid>/exe is bash and nothing after this works.
PID=""
for p in /proc/[0-9]*; do
  exe=$(readlink -f "$p/exe" 2>/dev/null) || continue
  case "$(basename "$exe")" in node|nodejs) ;; *) continue ;; esac
  tr '\0' '\n' < "$p/cmdline" 2>/dev/null | grep -q 'server\.js$' || continue
  PID=${p#/proc/}; break
done

if [ -z "$PID" ]; then
  echo "No 'node server.js' process is running on this machine."
  echo "If the site is answering anyway it is served from somewhere else — another"
  echo "host, or a container. Run this inside that container."
  exit 1
fi

# The node the server itself is running under, not whatever is on PATH. sudo
# resolves a different one on plenty of machines, and an older node has no
# node:sqlite, which fails as "No such built-in module" — a message that says
# nothing about PATH.
NODE=$(readlink -f "/proc/$PID/exe")
APPDIR=$(readlink -f "/proc/$PID/cwd")
APPUSER=$(ps -o user= -p "$PID" | tr -d ' ')

DB=$(tr '\0' '\n' < "/proc/$PID/environ" 2>/dev/null | sed -n 's/^PREP_DB=//p' || true)
# The open file descriptor is the part that cannot be argued with.
[ -n "$DB" ] || DB=$(ls -l "/proc/$PID/fd" 2>/dev/null | grep -o '/[^ ]*\.sqlite' | head -1 || true)
[ -n "$DB" ] || DB="$APPDIR/data/prep.sqlite"

echo "pid       $PID"
echo "node      $NODE  ($("$NODE" -v 2>/dev/null))"
echo "directory $APPDIR"
echo "runs as   $APPUSER"
echo "database  $DB"

[ -f "$APPDIR/scripts/accounts.js" ] || {
  echo; echo "No scripts/accounts.js under $APPDIR — this checkout is incomplete."; exit 1; }

cd "$APPDIR"
run() { sudo -u "$APPUSER" -H env PREP_DB="$DB" "$NODE" scripts/accounts.js "$@"; }

say "Clearing any lockout"
# Five wrong passwords lock the account for fifteen minutes, and that lock lives
# in the database — restarting the server does not clear it. Chasing a sign-in
# usually means several wrong tries, so clear it before testing the new one.
run unlock

say "Resetting the administrator password"
if [ -n "$WANTED" ]; then run reset-admin "$WANTED"; else run reset-admin; fi

say "State of this installation"
run doctor 2>/dev/null || echo "(this checkout predates 'doctor' — update it to get the full report)"

say "Done"
echo "The password above is printed ONCE and stored only as a hash."
echo "Sign in at /admin/ and change it under Administration."
echo
echo "If Run Command was used to get here, that password is now in the SSM command"
echo "history — which is one more reason to change it rather than keep it."
