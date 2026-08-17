#!/usr/bin/env bash
# The FIRST install on a fresh EC2 instance. Run once, by hand.
#
# deploy/ec2-deploy.sh updates an installation that already exists — it fetches,
# installs, restarts. It does not create one, and the first deploy through the
# GitHub pipeline failed on exactly that:
#
#   bash: /opt/vpet-prep/deploy/ec2-deploy.sh: No such file or directory
#   failed to run commands: exit status 127
#
# OIDC and Systems Manager were both working; the command reached the instance
# and ran. There was simply nothing at that path, because nobody had ever put
# it there. This script is that missing step.
#
# Run it as root on the instance:
#
#   sudo bash ec2-bootstrap.sh
#
# or paste it into Systems Manager → Run Command → AWS-RunShellScript.
# It is safe to run twice: every step checks before it acts.
set -euo pipefail

REPO="${REPO:-https://github.com/thankyouu91/PREPTEST.git}"
BRANCH="${BRANCH:-claude/prep-test-platform-design-fpiuqn}"
APP_DIR="${APP_DIR:-/opt/vpet-prep}"
DATA_DIR="${DATA_DIR:-/var/lib/vpet-prep}"
APP_USER="${APP_USER:-vpet}"
SERVICE="${SERVICE:-vpet-prep}"
ENV_FILE="${ENV_FILE:-/etc/vpet-prep.env}"

say() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
[ "$(id -u)" -eq 0 ] || { echo "Run this as root."; exit 1; }

say "Is something already serving this?"
# Worth knowing before anything else. An app installed by hand somewhere else
# still holds port 3000 and still holds the database everybody is signing in
# against — and installing a second one beside it means half the sign-ins go to
# a database that does not have the password you just set.
EXISTING="$(ss -ltnp 2>/dev/null | awk '/:3000 /{print $NF}' | head -1 || true)"
if [ -n "$EXISTING" ]; then
  echo "Port 3000 is already taken: $EXISTING"
  echo "Find what it is and where its database lives BEFORE continuing:"
  echo "  pgrep -af 'node server.js'"
  echo "  sudo ls -l /proc/<pid>/cwd /proc/<pid>/fd | grep -i sqlite"
  echo "If that is an older hand-made install, stop it and move its database to"
  echo "$DATA_DIR/prep.sqlite so the accounts in it survive. Re-run with"
  echo "IGNORE_PORT=1 once you have decided."
  [ "${IGNORE_PORT:-0}" = "1" ] || exit 1
fi

say "Node"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  # node:sqlite is what the data layer is built on, and it arrived in Node 22.
  curl -fsSL https://rpm.nodesource.com/setup_22.x -o /tmp/nodesource.sh 2>/dev/null \
    || curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource.sh
  bash /tmp/nodesource.sh
  (dnf install -y nodejs || yum install -y nodejs || apt-get install -y nodejs)
fi
node --version

say "Account and directories"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
# The database and the uploads live OUTSIDE the checkout, because ec2-deploy.sh
# resets the working tree on every deploy and would otherwise take them with it.
install -d -o "$APP_USER" -g "$APP_USER" -m 0750 "$DATA_DIR" "$DATA_DIR/audio"

say "Checkout"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch origin "$BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
  sudo -u "$APP_USER" git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
fi
sudo -u "$APP_USER" npm --prefix "$APP_DIR" ci --omit=dev --no-audit --no-fund

say "Secrets"
if [ ! -f "$ENV_FILE" ]; then
  # Generated here and printed once. A password written into this script, or
  # into the systemd unit, is a password in a file that gets copied around.
  ADMIN_PW="$(node -e 'console.log(require("crypto").randomBytes(12).toString("base64url"))')"
  umask 077
  cat > "$ENV_FILE" <<EOF
# Read by systemd (EnvironmentFile). Root only, and it is not in the repository.
# Better still: put these in AWS Secrets Manager and set AWS_SECRETS_ID instead
# — see the README. Then this file holds one line and nothing sensitive.
ADMIN_PASSWORD=$ADMIN_PW
EOF
  chmod 600 "$ENV_FILE"
  echo "Administrator password, shown ONCE:  $ADMIN_PW"
  echo "(stored only as a hash once the server boots; change it in Administration)"
else
  echo "$ENV_FILE already exists — leaving it alone."
fi

say "Service"
install -m 0644 "$APP_DIR/deploy/vpet-prep.service" "/etc/systemd/system/$SERVICE.service"
systemctl daemon-reload
systemctl enable "$SERVICE"
systemctl restart "$SERVICE"

say "Health"
for i in $(seq 1 20); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/healthz; then
    echo "healthy after $i attempt(s)"
    say "Installed at $APP_DIR — deploys from GitHub will work from here on"
    echo "Check what it is really running:"
    echo "  sudo -u $APP_USER node $APP_DIR/scripts/accounts.js doctor"
    exit 0
  fi
  sleep 0.5
done

say "It did not come up"
journalctl -u "$SERVICE" -n 40 --no-pager || true
exit 1
