#!/usr/bin/env bash
# What the EC2 instance runs when a deploy arrives.
#
# This lives in the repository rather than inside the GitHub workflow on
# purpose: the workflow should say WHEN to deploy, and this should say HOW. If
# the instance ever changes shape — a different path, a different service name,
# a container instead of systemd — the change belongs here, in one file, next
# to the unit that describes the same assumptions.
#
# It is run by AWS Systems Manager, as root, with no arguments. SSM rather than
# SSH is deliberate: there is no key to put in GitHub, no port 22 to leave open,
# and AWS records who ran what.
#
# Assumptions, all of them changeable at the top of this file. `accounts.js
# doctor` on the instance will tell you which ones are actually true.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vpet-prep}"
APP_USER="${APP_USER:-vpet}"
SERVICE="${SERVICE:-vpet-prep}"
BRANCH="${BRANCH:-claude/prep-test-platform-design-fpiuqn}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/healthz}"

say() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

say "Fetching $BRANCH"
cd "$APP_DIR"
sudo -u "$APP_USER" git fetch --prune origin "$BRANCH"
PREVIOUS="$(git rev-parse HEAD)"
echo "current: $PREVIOUS"

# Hard reset rather than merge: this checkout is a deployment artefact, not
# somebody's working copy, and a merge conflict at 3am on a box nobody is
# looking at is not a state worth being able to reach.
sudo -u "$APP_USER" git reset --hard "origin/$BRANCH"
echo "now:     $(git rev-parse HEAD)"

say "Installing"
# --omit=dev: the runtime needs express and nothing else. Tailwind and
# playwright-core are build and test tools and have no business on a server.
sudo -u "$APP_USER" npm ci --omit=dev --no-audit --no-fund

say "Building CSS"
# The built stylesheet is committed, so this is a belt-and-braces rebuild for
# the case where it was not. It needs the dev dependency, so it is allowed to
# fail without failing the deploy.
sudo -u "$APP_USER" npx --no-install tailwindcss -i ./src/tailwind.css -o ./public/tailwind-built.css --minify \
  || echo "(tailwind not installed here; using the committed stylesheet)"

say "Restarting $SERVICE"
systemctl restart "$SERVICE"

say "Health"
# The health check does a real database round trip, so this is not merely
# "did the process start" — it is "can it answer". Twenty tries at half a
# second is ten seconds, which is longer than a cold boot of this app.
for i in $(seq 1 20); do
  if curl -fsS -o /dev/null "$HEALTH_URL"; then
    echo "healthy after $i attempt(s)"
    say "Deployed $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 0.5
done

# A deploy that cannot answer /healthz is a deploy that is down. Go back to the
# commit that was running, restart, and fail loudly — an automated rollback is
# only worth having if the failure is still reported.
say "UNHEALTHY — rolling back to $PREVIOUS"
sudo -u "$APP_USER" git reset --hard "$PREVIOUS"
sudo -u "$APP_USER" npm ci --omit=dev --no-audit --no-fund || true
systemctl restart "$SERVICE"
journalctl -u "$SERVICE" -n 40 --no-pager || true
exit 1
