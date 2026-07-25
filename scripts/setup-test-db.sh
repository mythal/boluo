#!/usr/bin/env bash
# Wrapper script: start a temporary PostgreSQL instance, run the test, clean up.
#
# If PostgreSQL tools are not available (e.g. non-Nix environment), the test
# binary is exec'd directly and relies on the user-provided DATABASE_URL.
set -euo pipefail

if ! command -v postgres &>/dev/null; then
    exec "$@"
fi

PGDATA="$(mktemp -d)"
cleanup() { pg_ctl stop -D "$PGDATA" -m immediate -w > /dev/null 2>&1; rm -rf "$PGDATA"; }
trap cleanup EXIT

initdb --no-locale --encoding=UTF8 --username=postgres -D "$PGDATA" > /dev/null
postgres -D "$PGDATA" -k "$PGDATA" -h '' > "$PGDATA/server.log" 2>&1 &

for _ in $(seq 1 30); do
    pg_isready -h "$PGDATA" -q 2>/dev/null && break
    sleep 0.1
done

export DATABASE_URL="postgresql:///postgres?host=$PGDATA&user=postgres"
"$@"
