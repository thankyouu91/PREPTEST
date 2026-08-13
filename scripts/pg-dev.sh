#!/usr/bin/env bash
# Start a throwaway PostgreSQL and print its URL, or print nothing and exit 1.
#
# The schema check needs a real server — a translation that only looks right is
# exactly what it exists to catch — but requiring a database for the whole suite
# would make `npm run verify` unrunnable on a laptop that has not got one. So
# this is best effort: it starts a cluster when the binaries are there, and says
# why it could not when they are not. Nothing here touches an existing cluster;
# the data directory is fresh, on a spare port, and thrown away with the machine.
#
#   eval "$(scripts/pg-dev.sh)"    # exports PG_URL when it works
set -uo pipefail

PORT="${PG_DEV_PORT:-5433}"
DATA="${PG_DEV_DATA:-/var/tmp/vpet-pgdata}"
DBNAME=vpet_verify

fail() { echo "# pg-dev: $1" >&2; exit 1; }

# Debian keeps the server binaries out of PATH, one directory per major version.
BIN=""
for d in /usr/lib/postgresql/*/bin /usr/pgsql-*/bin /opt/homebrew/opt/postgresql*/bin; do
  [ -x "$d/initdb" ] && BIN="$d"
done
[ -n "$BIN" ] || command -v initdb >/dev/null 2>&1 && BIN="${BIN:-$(dirname "$(command -v initdb)")}"
[ -n "$BIN" ] || fail "no PostgreSQL server binaries found (initdb)"

# initdb refuses to run as root, so the cluster belongs to the postgres user
# when there is one. Without sudo there is nothing sensible to do but say so.
AS=""
if [ "$(id -u)" = "0" ]; then
  id postgres >/dev/null 2>&1 || fail "running as root and there is no postgres user to own the cluster"
  sudo -n true 2>/dev/null || fail "running as root and sudo is not available to drop privileges"
  AS="sudo -n -u postgres"
fi

if ! $AS "$BIN/pg_isready" -q -h 127.0.0.1 -p "$PORT" 2>/dev/null; then
  if [ ! -s "$DATA/PG_VERSION" ]; then
    rm -rf "$DATA"
    if [ -n "$AS" ]; then sudo -n install -d -o postgres -g postgres -m 700 "$DATA" || fail "could not create $DATA"
    else mkdir -p "$DATA"; fi
    # trust auth on loopback only: this cluster holds nothing and lives minutes.
    $AS "$BIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null 2>&1 \
      || fail "initdb failed"
  fi
  $AS "$BIN/pg_ctl" -D "$DATA" -l /var/tmp/vpet-pg.log \
    -o "-p $PORT -k /var/tmp -c listen_addresses=127.0.0.1" start >/dev/null 2>&1 \
    || fail "pg_ctl could not start the cluster (see /var/tmp/vpet-pg.log)"
  for _ in $(seq 1 20); do
    $AS "$BIN/pg_isready" -q -h 127.0.0.1 -p "$PORT" 2>/dev/null && break
    sleep 0.3
  done
fi

$AS "$BIN/pg_isready" -q -h 127.0.0.1 -p "$PORT" 2>/dev/null || fail "the cluster never came up"

# A fresh database each time: the schema check drops and rebuilds `public`, and
# it should never be pointed at something somebody cares about.
$AS "$BIN/dropdb" -h 127.0.0.1 -p "$PORT" -U postgres --if-exists "$DBNAME" >/dev/null 2>&1
$AS "$BIN/createdb" -h 127.0.0.1 -p "$PORT" -U postgres "$DBNAME" >/dev/null 2>&1 \
  || fail "could not create the $DBNAME database"

echo "export PG_URL=postgres://postgres@127.0.0.1:$PORT/$DBNAME"
