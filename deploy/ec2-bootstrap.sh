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

REPO_HTTPS="${REPO_HTTPS:-https://github.com/thankyouu91/PREPTEST.git}"
REPO_SSH="${REPO_SSH:-git@github.com:thankyouu91/PREPTEST.git}"
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

say "Can this instance read the repository?"
# Checked before anything uses them. Without openssh-clients, `ssh-keyscan >
# known_hosts` leaves an EMPTY file, the guard below then thinks the work is
# done, and the clone fails much later with "Host key verification failed" —
# which sends you looking at GitHub rather than at a missing package.
if ! command -v ssh-keygen >/dev/null || ! command -v ssh-keyscan >/dev/null; then
  echo "openssh-clients is not installed; installing it."
  (dnf install -y openssh-clients || yum install -y openssh-clients || apt-get install -y openssh-client) \
    || { echo "Could not install openssh-clients. Install it and run this again."; exit 1; }
fi
install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
SSH_DIR="$APP_DIR/.ssh"
KEY="$SSH_DIR/id_ed25519"
install -d -o "$APP_USER" -g "$APP_USER" -m 0700 "$SSH_DIR"

# Generated HERE, on the machine that will use it. The private half never
# leaves this disk — not into a chat window, not into the repository, not into
# a password manager. What goes to GitHub is the .pub half, which is not a
# secret and cannot be used to read anything on its own.
if [ ! -f "$KEY" ]; then
  sudo -u "$APP_USER" -H ssh-keygen -t ed25519 -N '' -q \
    -C "vpet-prep deploy key on $(hostname)" -f "$KEY"
fi

if [ ! -s "$SSH_DIR/known_hosts" ]; then
  ssh-keyscan -t ed25519 github.com > "$SSH_DIR/known_hosts" 2>/dev/null || true
  [ -s "$SSH_DIR/known_hosts" ] || {
    echo "Could not reach github.com to read its host key. Check egress from this"
    echo "instance (port 22 outbound, or a NAT gateway) and run this again."
    rm -f "$SSH_DIR/known_hosts"; exit 1; }
  chown "$APP_USER:$APP_USER" "$SSH_DIR/known_hosts"
  chmod 600 "$SSH_DIR/known_hosts"
  # Printed rather than trusted quietly: the first fetch of a host key is the
  # one moment a man in the middle would matter, and GitHub publishes its
  # fingerprints so the comparison takes ten seconds.
  echo "github.com host key — compare against the published list before continuing:"
  echo "  https://docs.github.com/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints"
  ssh-keygen -lf "$SSH_DIR/known_hosts"
fi

cat > "$SSH_DIR/config" <<EOF
Host github.com
  IdentityFile $KEY
  IdentitiesOnly yes
  StrictHostKeyChecking yes
  UserKnownHostsFile $SSH_DIR/known_hosts
EOF
chown "$APP_USER:$APP_USER" "$SSH_DIR/config"
chmod 600 "$SSH_DIR/config"

# HTTPS first, because a public repository needs no key at all and reaching for
# one would be a credential nobody had to create. SSH second, which is what a
# private repository needs.
REPO=""
if sudo -u "$APP_USER" -H git ls-remote "$REPO_HTTPS" >/dev/null 2>&1; then
  REPO="$REPO_HTTPS"; echo "readable over HTTPS — the repository is public"
elif sudo -u "$APP_USER" -H git ls-remote "$REPO_SSH" >/dev/null 2>&1; then
  REPO="$REPO_SSH"; echo "readable over SSH — the deploy key is already in place"
else
  say "The repository is private and this key is not on it yet"
  echo "Add this PUBLIC key as a read-only deploy key:"
  echo
  echo "  https://github.com/thankyouu91/PREPTEST/settings/keys/new"
  echo
  cat "$KEY.pub"
  echo
  echo "Leave 'Allow write access' UNTICKED. A deploy key that can write is a"
  echo "server that can rewrite the repository it deploys from."
  echo
  echo "Then run this script again — it will carry on from here."
  exit 1
fi

say "Checkout"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" -H git -C "$APP_DIR" remote set-url origin "$REPO"
  sudo -u "$APP_USER" -H git -C "$APP_DIR" fetch origin "$BRANCH"
  sudo -u "$APP_USER" -H git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  # Clone into a directory that already exists (the key lives there), so clone
  # the working tree in rather than asking git to create the directory.
  sudo -u "$APP_USER" -H git -C "$APP_DIR" init -q
  sudo -u "$APP_USER" -H git -C "$APP_DIR" remote add origin "$REPO" 2>/dev/null || \
    sudo -u "$APP_USER" -H git -C "$APP_DIR" remote set-url origin "$REPO"
  sudo -u "$APP_USER" -H git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  sudo -u "$APP_USER" -H git -C "$APP_DIR" checkout -B "$BRANCH" FETCH_HEAD
fi
sudo -u "$APP_USER" -H npm --prefix "$APP_DIR" ci --omit=dev --no-audit --no-fund

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
