#!/usr/bin/env bash
# What is actually on this machine? Read-only. Changes nothing.
#
# Run it before deploy/ec2-bootstrap.sh on a box that is already serving
# something, which is the case this exists for. The first install went on by
# hand, nobody wrote down where it put the database, and installing a second
# copy beside it means half the sign-ins go to a database that does not have
# the password you just set.
#
#   sudo bash survey.sh
#
# or paste it into Systems Manager -> Run Command -> AWS-RunShellScript.
#
# ## It prints no secrets
#
# The environment file is reported by KEY NAME only, never by value. The whole
# point of this script is that its output can be pasted into a chat window to
# ask someone what to do next, and an output that carries an API key is one
# that cannot be shared - which would defeat it.
set -uo pipefail

say() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
[ "$(id -u)" -eq 0 ] || { echo "Run this as root (sudo -i first)."; exit 1; }

say "Machine"
(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME") || uname -a
echo "hostname: $(hostname)"
echo "node:     $(command -v node >/dev/null && node --version || echo 'not installed')"
echo "npm:      $(command -v npm >/dev/null && npm --version || echo 'not installed')"

say "Disk"
# A deploy that runs out of disk fails in ways that read like something else.
df -h / /var 2>/dev/null | awk 'NR==1 || /\/$|\/var/'

say "Who is holding port 3000"
# Three tools, because a minimal server image reliably has none of any given
# one. Reporting "(ss not available)" and stopping would hide the single most
# important fact this script is here to establish.
PORT_OUT=""
if command -v ss >/dev/null; then
  PORT_OUT="$(ss -ltnp 2>/dev/null | awk '/:3000 /')"
elif command -v netstat >/dev/null; then
  PORT_OUT="$(netstat -ltnp 2>/dev/null | awk '/:3000 /')"
elif command -v lsof >/dev/null; then
  PORT_OUT="$(lsof -iTCP:3000 -sTCP:LISTEN -P -n 2>/dev/null | tail -n +2)"
else
  PORT_OUT="(none of ss, netstat or lsof is installed — see the pid list below)"
fi
# Said in words rather than left as a blank section. "Nothing is listening" and
# "the tool printed nothing" look identical as empty output, and they lead to
# opposite next steps.
[ -n "$PORT_OUT" ] && echo "$PORT_OUT" || echo "NOTHING is listening on port 3000."

say "The running application"
PIDS="$(pgrep -f 'node .*server\.js' || true)"
if [ -z "$PIDS" ]; then
  echo "Nothing matching 'node server.js' is running."
else
  for PID in $PIDS; do
    echo "--- pid $PID ---"
    echo "command:  $(tr '\0' ' ' < /proc/$PID/cmdline 2>/dev/null)"
    echo "cwd:      $(readlink -f /proc/$PID/cwd 2>/dev/null)"
    echo "user:     $(ps -o user= -p "$PID" 2>/dev/null | tr -d ' ')"
    echo "started:  $(ps -o lstart= -p "$PID" 2>/dev/null | sed 's/^ *//')"
    # THE line this whole script exists for. A process holds its database open,
    # so /proc/<pid>/fd is the only answer that cannot be out of date - a path
    # in a config file is what somebody INTENDED, and those two differ exactly
    # when it matters.
    echo "open database files:"
    ls -l /proc/$PID/fd 2>/dev/null | grep -iE 'sqlite|\.db' | sed 's/^/  /' \
      || echo "  (none found — the database may be somewhere unexpected)"
  done
fi

say "How it is started"
# Three ways this could have been set up, and each is stopped differently.
systemctl list-units --type=service --all --no-pager 2>/dev/null \
  | grep -iE 'vpet|prep|node' | sed 's/^/  /' || true
echo "--- pm2 ---"
command -v pm2 >/dev/null && (pm2 list 2>/dev/null | sed 's/^/  /') || echo "  pm2 not installed"
echo "--- crontab (root) ---"
crontab -l 2>/dev/null | grep -iE 'node|server|prep' | sed 's/^/  /' || echo "  nothing relevant"

say "Is the deploy target already there"
if [ -d /opt/vpet-prep/.git ]; then
  echo "/opt/vpet-prep exists and is a git checkout:"
  git -C /opt/vpet-prep log --oneline -1 2>/dev/null | sed 's/^/  /'
  git -C /opt/vpet-prep remote -v 2>/dev/null | head -1 | sed 's/^/  /'
elif [ -d /opt/vpet-prep ]; then
  echo "/opt/vpet-prep exists but is NOT a git checkout — contents:"
  ls -la /opt/vpet-prep | head -10 | sed 's/^/  /'
else
  echo "/opt/vpet-prep does not exist — this is why ec2-deploy.sh exits 127."
fi

say "Where a deploy would keep the database"
if [ -d /var/lib/vpet-prep ]; then
  ls -la /var/lib/vpet-prep | sed 's/^/  /'
else
  echo "/var/lib/vpet-prep does not exist yet (bootstrap creates it)."
fi

say "Every SQLite file on this machine"
# Bounded, and skipping the places a database is never legitimately kept, so
# this finishes in seconds rather than walking a whole disk.
find / -xdev \
  \( -path /proc -o -path /sys -o -path /snap -o -path /tmp -o -path /usr/share \
     -o -path '*/node_modules' -o -path /var/lib/docker \) -prune \
  -o -name '*.sqlite' -type f -print 2>/dev/null | head -20 | while read -r f; do
    printf '  %s  %s  %s\n' "$(du -h "$f" 2>/dev/null | cut -f1)" \
      "$(stat -c '%U:%G' "$f" 2>/dev/null)" "$f"
  done
echo "(size, owner, path — the big one that is owned by the app user is the real one)"

say "Environment file"
# Names only. Never values. See the note at the top.
if [ -f /etc/vpet-prep.env ]; then
  echo "/etc/vpet-prep.env exists, permissions $(stat -c '%a %U:%G' /etc/vpet-prep.env)"
  echo "keys set (values deliberately NOT shown):"
  grep -oE '^[A-Za-z_][A-Za-z0-9_]*' /etc/vpet-prep.env 2>/dev/null | sed 's/^/  /'
else
  echo "/etc/vpet-prep.env does not exist."
fi

say "What nginx is proxying to"
grep -rhE 'proxy_pass|server_name|listen ' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null \
  | sed 's/^[[:space:]]*/  /' | sort -u | head -20 || echo "  (no nginx config found)"

say "Can it answer"
curl -fsS -m 5 http://127.0.0.1:3000/healthz 2>/dev/null && echo || echo "  no answer on 127.0.0.1:3000"

say "Done — nothing was changed"
echo "Paste this whole output back to whoever is guiding the install."
