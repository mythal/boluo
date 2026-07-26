#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${BOLUO_PGBACKREST_CHECK_ON_START:-0}" != 1 ]]; then
    exit 0
fi

until pg_isready --quiet --dbname="${POSTGRES_DB}" --username="${POSTGRES_USER}"; do
    sleep 1
done

until pgbackrest --stanza="${PGBACKREST_STANZA}" stanza-create; do
    echo >&2 "warning: pgBackRest stanza creation failed; retrying in 60 seconds"
    sleep 60
done

until pgbackrest --stanza="${PGBACKREST_STANZA}" check; do
    echo >&2 "warning: pgBackRest check failed; retrying in 60 seconds"
    sleep 60
done
