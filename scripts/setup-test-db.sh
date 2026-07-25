#!/bin/sh
# Wrapper script: start a temporary PostgreSQL instance, run the test, clean up.
set -eu

if ! command -v postgres >/dev/null 2>&1; then
    exec "$@"
fi

PGDATA="$(mktemp --directory)"
cleanup() { pg_ctl stop --pgdata="$PGDATA" --mode=immediate --wait > /dev/null 2>&1; rm -rf "$PGDATA"; }
trap cleanup EXIT

initdb --no-locale --encoding=UTF8 --username=postgres --pgdata="$PGDATA" > /dev/null
postgres -D "$PGDATA" -k "$PGDATA" -h '' > "$PGDATA/server.log" 2>&1 &

for _ in $(seq 1 30); do
    pg_isready --host="$PGDATA" --quiet 2>/dev/null && break
    sleep 0.1
done

export DATABASE_URL="postgresql:///postgres?host=$PGDATA&user=postgres"
"$@"
