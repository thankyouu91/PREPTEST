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

# Set PM2_APP when the application is run by PM2 rather than by systemd, and it
# is restarted through PM2 instead. This is not a hypothetical: the instance
# this deploys to today runs `preptest` under PM2 as the `ubuntu` user, from
# that user's home directory — put there by hand long before any of this
# existed. deploy/survey.sh is what established that, and the alternative was
# to install a second copy of the application beside the first and leave every
# existing account in a database nothing pointed at any more.
PM2_APP="${PM2_APP:-}"

say() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

# EVERY git call, reads included, runs as the user that owns the checkout.
#
# Git refuses to work on a repository owned by somebody else — "detected
# dubious ownership" — and that is a real protection rather than a nuisance: a
# root process reading a repo that another user can write is a root process
# about to run whatever that user put in .git/config.
#
# The mutations were wrapped in sudo from the start. Three `git rev-parse`
# calls were not, and on a checkout owned by `ubuntu` that is exactly where the
# first real deploy stopped: the fetch succeeded, the next line ran as root,
# and set -e ended the run with the new code already on disk and nothing
# restarted. A helper rather than three more sudo prefixes, so the next git
# call added here cannot quietly be the fourth.
git_as() { sudo -u "$APP_USER" -H git "$@"; }

# Whichever of the two is in charge here. Kept as one function because the
# rollback path has to restart exactly the same way the deploy did — two copies
# of this decision is how a rollback silently restarts nothing.
restart_app() {
  if [ -n "$PM2_APP" ]; then
    # Deliberately WITHOUT --update-env.
    #
    # PM2 keeps each app's environment in its own process list, and a plain
    # restart reuses it. `--update-env` means "throw that away and take the
    # calling shell's instead" — and the calling shell here is Systems Manager
    # running as root with almost no environment at all.
    #
    # So the flag that looks like housekeeping is the one that would silently
    # wipe TOKEN_ENCRYPTION_KEY on the next deploy, and with it the ability to
    # read back the stored API key. Everything would still start; marking would
    # simply stop, and the first anyone would know is a candidate with no band.
    #
    # To CHANGE the environment, do it once by hand — that is the moment you
    # actually mean it — and `pm2 save` writes it into the dump that survives
    # both deploys and reboots:
    #     sudo -u ubuntu TOKEN_ENCRYPTION_KEY=... pm2 restart preptest --update-env
    #     sudo -u ubuntu pm2 save
    sudo -u "$APP_USER" -H pm2 restart "$PM2_APP"
    # The saved process list is what `pm2 resurrect` reads after a reboot. A
    # deploy that does not re-save leaves the boot-time list describing an
    # older state of the world, which nobody discovers until the machine
    # restarts and comes back running something else.
    sudo -u "$APP_USER" -H pm2 save
  else
    systemctl restart "$SERVICE"
  fi
}

# -H on every sudo: without it HOME stays root's, ssh looks in /root/.ssh for a
# key that is in the app user's home, and a private repository fails to fetch
# with "Permission denied (publickey)" on a machine where the key is fine.
say "Fetching $BRANCH"
cd "$APP_DIR"
git_as fetch --prune origin "$BRANCH"
PREVIOUS="$(git_as rev-parse HEAD)"
echo "current: $PREVIOUS"

# Hard reset rather than merge: this checkout is a deployment artefact, not
# somebody's working copy, and a merge conflict at 3am on a box nobody is
# looking at is not a state worth being able to reach.
git_as reset --hard "origin/$BRANCH"
echo "now:     $(git_as rev-parse HEAD)"

say "Installing"
# --omit=dev: the runtime needs express and nothing else. Tailwind and
# playwright-core are build and test tools and have no business on a server.
sudo -u "$APP_USER" -H npm ci --omit=dev --no-audit --no-fund

say "Building CSS"
# The built stylesheet is committed, so this is a belt-and-braces rebuild for
# the case where it was not. It needs the dev dependency, so it is allowed to
# fail without failing the deploy.
sudo -u "$APP_USER" -H npx --no-install tailwindcss -i ./src/tailwind.css -o ./public/tailwind-built.css --minify \
  || echo "(tailwind not installed here; using the committed stylesheet)"

say "Restarting ${PM2_APP:-$SERVICE}"
restart_app

say "Health"
# The health check does a real database round trip, so this is not merely
# "did the process start" — it is "can it answer". Twenty tries at half a
# second is ten seconds, which is longer than a cold boot of this app.
for i in $(seq 1 20); do
  if curl -fsS -o /dev/null "$HEALTH_URL"; then
    echo "healthy after $i attempt(s)"
    say "Deployed $(git_as rev-parse --short HEAD)"
    exit 0
  fi
  sleep 0.5
done

# A deploy that cannot answer /healthz is a deploy that is down. Go back to the
# commit that was running, restart, and fail loudly — an automated rollback is
# only worth having if the failure is still reported.
say "UNHEALTHY — rolling back to $PREVIOUS"
git_as reset --hard "$PREVIOUS"
sudo -u "$APP_USER" -H npm ci --omit=dev --no-audit --no-fund || true
restart_app
# Where the reason lives depends on who is running it. Asking journalctl about
# a systemd unit that does not exist prints nothing at all, which reads as "no
# errors" at the exact moment there certainly are some.
if [ -n "$PM2_APP" ]; then
  sudo -u "$APP_USER" -H pm2 logs "$PM2_APP" --lines 40 --nostream || true
else
  journalctl -u "$SERVICE" -n 40 --no-pager || true
fi
exit 1
