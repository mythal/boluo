#!/usr/bin/env bash
set -Eeuo pipefail

if [[ -z "${PGBACKREST_STANZA:-}" ]]; then
    exit 0
fi

until pgbackrest --stanza="${PGBACKREST_STANZA}" stanza-create; do
    echo >&2 "warning: pgBackRest stanza creation failed; retrying in 60 seconds"
    sleep 60
done

until pgbackrest --stanza="${PGBACKREST_STANZA}" check; do
    echo >&2 "warning: pgBackRest check failed; retrying in 60 seconds"
    sleep 60
done
