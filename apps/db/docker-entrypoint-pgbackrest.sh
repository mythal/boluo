#!/usr/bin/env bash
set -Eeuo pipefail

readonly pgbackrest_secret_file="/run/secrets/pgbackrest-sftp-private-key"
readonly pgbackrest_private_key_file="/run/pgbackrest/id_rsa_sftp"

if [[ -n "${PGBACKREST_STANZA:-}" && "${1:-}" == "postgres" ]]; then
    if [[ ! -s "${pgbackrest_secret_file}" ]]; then
        echo >&2 "error: ${pgbackrest_secret_file} is required when PGBACKREST_STANZA is set"
        exit 1
    fi

    install -d -m 0700 -o postgres -g postgres "$(dirname "${pgbackrest_private_key_file}")"
    install -m 0600 -o postgres -g postgres \
        "${pgbackrest_secret_file}" \
        "${pgbackrest_private_key_file}"

    export POSTGRES_USER="${POSTGRES_USER:-postgres}"
    export POSTGRES_DB="${POSTGRES_DB:-${POSTGRES_USER}}"

    if [[ -s "${PGDATA}/PG_VERSION" ]]; then
        export BOLUO_PGBACKREST_CHECK_ON_START=1
    else
        export BOLUO_PGBACKREST_CHECK_ON_START=0
    fi

    supervisord --configuration=/etc/supervisor/supervisord.conf &

    set -- \
        "$@" \
        -c archive_mode=on \
        -c archive_timeout=1h \
        -c "archive_command=pgbackrest --stanza=${PGBACKREST_STANZA} archive-push %p"
fi

exec /usr/local/bin/docker-entrypoint.sh "$@"
