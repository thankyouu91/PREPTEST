#!/usr/bin/env bash
# Put the database backups on a schedule, and make a stopped schedule visible.
#
# Run once, on the box, as root:
#
#   sudo APP_DIR=/home/ubuntu/PREPTEST APP_USER=ubuntu bash deploy/install-backup-cron.sh
#
# Two entries, not one, and the second is the one that matters:
#
#   every 6 hours   take a backup
#   every hour      ask whether the backup situation is healthy, and shout if not
#
# The commonest way a backup system fails is not by breaking loudly on the day
# it is needed. It is by quietly stopping months earlier while everyone carries
# on believing it runs. A schedule with no check on it is that failure waiting
# to happen, so `check` exits non-zero when the newest backup is over twelve
# hours old — cron mails on non-zero output, and the line lands in syslog where
# a monitor can find it.
#
# Idempotent: re-running replaces the block rather than adding a second copy.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/PREPTEST}"
APP_USER="${APP_USER:-ubuntu}"
ENV_FILE="${ENV_FILE:-/etc/vpet-prep.env}"
CRON_FILE=/etc/cron.d/vpet-prep-backup
LOG=/var/log/vpet-prep-backup.log

[ "$(id -u)" = "0" ] || { echo "Run this with sudo."; exit 1; }
[ -d "$APP_DIR" ] || { echo "No such directory: $APP_DIR"; exit 1; }
id "$APP_USER" >/dev/null 2>&1 || { echo "No such user: $APP_USER"; exit 1; }

NODE_BIN="$(command -v node || true)"
[ -n "$NODE_BIN" ] || { echo "node is not on root's PATH; install it or set NODE_BIN."; exit 1; }

# cron runs with an almost empty environment — no PATH to speak of, and none of
# the configuration PM2 hands the server. Both entries therefore source the same
# env file the application uses, so the bucket and region are configured in
# exactly one place and cannot drift from what the app believes.
if [ ! -f "$ENV_FILE" ]; then
  echo "Warning: $ENV_FILE does not exist."
  echo "Backups will fall back to BACKUP_DRIVER=disk, which on this box means"
  echo "a copy on the same disk as the database — that is not a backup."
  echo "Create it with at least:"
  echo "  BACKUP_DRIVER=s3"
  echo "  BACKUP_BUCKET=<bucket with versioning and object lock on>"
  echo "  AWS_REGION=ap-southeast-1"
fi

cat > "$CRON_FILE" <<CRON
# VPET Prep — database backups. Written by deploy/install-backup-cron.sh.
# Do not edit by hand: re-running that script overwrites this file.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Take one, four times a day. Offset from the hour so it never lands on top of
# whatever else the box does at :00.
17 */6 * * * $APP_USER set -a; [ -f $ENV_FILE ] && . $ENV_FILE; set +a; cd $APP_DIR && $NODE_BIN scripts/backup.mjs run >> $LOG 2>&1

# Ask whether it is actually working. Silent when healthy — cron only mails when
# a job writes output, so anything at all here means something needs attention.
43 * * * * $APP_USER set -a; [ -f $ENV_FILE ] && . $ENV_FILE; set +a; cd $APP_DIR && $NODE_BIN scripts/backup.mjs check >> $LOG 2>&1 || echo "vpet-prep: BACKUP UNHEALTHY, see $LOG"
CRON

chmod 644 "$CRON_FILE"
touch "$LOG" && chown "$APP_USER" "$LOG"

# Keep the log from growing without limit; a backup log nobody rotates is a full
# disk in a year, which takes the database down for the opposite reason.
cat > /etc/logrotate.d/vpet-prep-backup <<ROT
$LOG {
  weekly
  rotate 8
  compress
  missingok
  notifempty
  copytruncate
}
ROT

echo "Installed $CRON_FILE"
echo
echo "Check it works right now, rather than finding out in six hours:"
echo "  sudo -u $APP_USER bash -c 'set -a; . $ENV_FILE; set +a; cd $APP_DIR && node scripts/backup.mjs run'"
echo "  sudo -u $APP_USER bash -c 'cd $APP_DIR && node scripts/backup.mjs list'"
echo
echo "And then do the one thing that turns a file into a backup — restore it:"
echo "  sudo -u $APP_USER bash -c 'cd $APP_DIR && node scripts/backup.mjs restore latest --into /tmp/try.sqlite --yes'"
