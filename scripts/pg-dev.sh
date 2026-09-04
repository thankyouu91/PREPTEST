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
# A new path on purpose: a cluster left behind by the trust-auth version of this
# script would be reused as it stands, and the point of the change is that this
# one asks for a password.
DATA="${PG_DEV_DATA:-/var/tmp/vpet-pgdata-auth}"
DBNAME=vpet_verify
# Not a secret: loopback only, holds nothing, thrown away with the machine. It
# exists so that the local cluster AUTHENTICATES, the way every real one does —
# and the way the CI service container does. The trust-auth cluster this used to
# start made scripts/test-pg-driver.mjs green here and red in CI for months: the
# check that a pool built from parts connects cannot see a dropped password when
# the server does not ask for one.
PASSWORD="${PG_DEV_PASSWORD:-vpet-dev}"

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
    # Password auth over TCP, trust over the Unix socket so pg_ctl and createdb
    # below need no credentials. The pwfile is read by initdb and removed here.
    PWFILE="$(mktemp /var/tmp/vpet-pgpw.XXXXXX)" || fail "could not write a password file"
    chmod 600 "$PWFILE"; printf '%s\n' "$PASSWORD" > "$PWFILE"
    [ -n "$AS" ] && chown postgres "$PWFILE" 2>/dev/null
    $AS "$BIN/initdb" -D "$DATA" -U postgres \
      --auth-local=trust --auth-host=scram-sha-256 --pwfile="$PWFILE" >/dev/null 2>&1
    rc=$?
    rm -f "$PWFILE"
    [ $rc -eq 0 ] || fail "initdb failed"
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
#
# Over the SOCKET, not 127.0.0.1: TCP now wants a password, and dropdb would sit
# waiting for one at a prompt nobody is watching — the whole script hangs, with
# the cluster up and no output. The socket is trust, and putting the password in
# the environment of a `sudo` command line would publish it in `ps` anyway.
SOCK=/var/tmp
$AS "$BIN/dropdb" -h "$SOCK" -p "$PORT" -U postgres --if-exists "$DBNAME" >/dev/null 2>&1
$AS "$BIN/createdb" -h "$SOCK" -p "$PORT" -U postgres "$DBNAME" >/dev/null 2>&1 \
  || fail "could not create the $DBNAME database"

echo "export PG_URL=postgres://postgres:$PASSWORD@127.0.0.1:$PORT/$DBNAME"
