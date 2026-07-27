# Production Database Recovery Runbook

This runbook restores a pgBackRest backup to a new Fly Volume, validates it in
isolation, and then switches production to the restored volume.

## Sources of truth

Use the deployed state at the time of the incident:

| Information                                                      | Source of truth                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| Fly app, primary region, volume mount, and secret name           | `fly.toml`                                                   |
| Production image, Machine configuration, services, and volume ID | `fly machine status --display-config` and `fly volumes list` |
| Stanza, PGDATA, and SFTP key destination                         | `/etc/pgbackrest/pgbackrest.conf` in the deployed image      |
| Database name and database user                                  | Production Machine environment                               |

If the checked-in configuration and deployed state differ, recover from the
deployed state and reconcile the repository after the incident.

## Safety rules

1. Never run `restore` against the existing production volume.
2. Use verified Machine IDs and Volume IDs for all destructive commands.
3. Never allow the old and restored databases to accept writes concurrently.
4. The old volume is a valid rollback target only before the restored database
   accepts writes.
5. Retain the old volume until the restored database has passed its observation
   period.
6. Do not run `fly deploy` while both old and replacement production Machines
   exist; it may start or update the wrong Machine.

## 1. Freeze and record the deployed state

Enable application maintenance mode, stop writes, and inspect the current
resources:

```sh
fly machine list --app <APP>
fly volumes list --app <APP>
fly machine status <OLD_MACHINE_ID> --app <APP> --display-config
```

Fill these variables from the output and the sources of truth above:

```sh
export APP='<app>'
export REGION='<primary-region>'
export IMAGE='<exact-image-reference-or-digest>'
export OLD_MACHINE_ID='<production-machine-id>'
export OLD_VOLUME_ID='<production-volume-id>'
export VOLUME_NAME='<mount-source-name>'
export VOLUME_MOUNT='<mount-destination>'
export VOLUME_SIZE_GB='<old-volume-size-or-larger>'
export SFTP_SECRET_NAME='<fly-secret-name>'
```

Save the complete `fly machine status --display-config` output separately. It
will be used to verify the replacement Machine's services, environment,
secrets, and command.

If the old database is already corrupt, stop it immediately. Otherwise, leave
it running without application writes until the target and final WAL are
recorded in step 2.

## 2. Select a recovery target

- **Latest reachable state:** use when the production volume is lost but the
  archived data is trustworthy.
- **Timestamp:** use for accidental deletion or corruption. Always include a
  timezone, for example `2026-07-27 09:15:00+09:00`. A timestamp is also
  sufficient for a planned recovery drill.

If the WAL archive has a gap, recovery cannot cross it. Record the actual RPO
from the pgBackRest output and PostgreSQL logs.

### Archive the final WAL and stop the source

If the source database is healthy and trustworthy, connect to it, force the
current WAL to be archived, and verify repository access:

```sh
fly ssh console --app "$APP" --machine "$OLD_MACHINE_ID"

gosu postgres psql -U <DB_USER> -d <DB_NAME> \
  -v ON_ERROR_STOP=1 \
  -c "SELECT pg_switch_wal();"
gosu postgres pgbackrest --stanza=<STANZA> check
exit
```

Then stop the source Machine:

```sh
fly machine stop "$OLD_MACHINE_ID" --app "$APP" --timeout 120
fly machine status "$OLD_MACHINE_ID" --app "$APP"
```

For a corrupt source, skip WAL switching and `pgbackrest check`. Stop it
immediately and choose a timestamp before the corruption.

## 3. Create an isolated recovery environment

Create a new volume instead of reusing existing data:

```sh
fly volumes create "$VOLUME_NAME" \
  --app "$APP" \
  --region "$REGION" \
  --size "$VOLUME_SIZE_GB"
```

Record the new volume ID:

```sh
export RESTORE_VOLUME_ID='<new-volume-id>'
export RESTORE_MACHINE_NAME='<temporary-restore-machine-name>'
```

Create a temporary Machine with no services, no internal DNS registration, and
no automatic restart:

```sh
fly machine run "$IMAGE" sleep infinity \
  --app "$APP" \
  --region "$REGION" \
  --name "$RESTORE_MACHINE_NAME" \
  --volume "$RESTORE_VOLUME_ID:$VOLUME_MOUNT" \
  --file-secret \
    "/run/secrets/pgbackrest-restore-key=$SFTP_SECRET_NAME" \
  --vm-memory 1024 \
  --vm-cpus 1 \
  --restart no \
  --autostart=false \
  --skip-dns-registration
```

Record the Machine ID and verify that it mounted the new volume:

```sh
export RESTORE_MACHINE_ID='<temporary-machine-id>'
fly machine status "$RESTORE_MACHINE_ID" \
  --app "$APP" \
  --display-config
```

## 4. Inspect the backup and restore

Connect to the temporary Machine:

```sh
fly ssh console --app "$APP" --machine "$RESTORE_MACHINE_ID"
```

Read the values used by the deployed image:

```sh
sed -n '1,240p' /etc/pgbackrest/pgbackrest.conf

export STANZA='<stanza>'
export PGDATA='<pg1-path>'
export PGBACKREST_KEY_FILE='<repo1-sftp-private-key-file>'
export DB_USER='<postgres-user>'
export DB_NAME='<database-name>'
```

Install the key and prepare an empty PGDATA:

```sh
install -d -m 0700 -o postgres -g postgres \
  "$(dirname "$PGBACKREST_KEY_FILE")"
install -m 0600 -o postgres -g postgres \
  /run/secrets/pgbackrest-restore-key \
  "$PGBACKREST_KEY_FILE"

install -d -m 0700 -o postgres -g postgres "$PGDATA"
test ! -e "$PGDATA/PG_VERSION"

gosu postgres pgbackrest --stanza="$STANZA" info
```

Confirm that the backup status is `ok`, the PostgreSQL major version matches,
and the required WAL can reach the target. Do not run `initdb` in the target
directory.

Choose one restore mode.

Restore the latest reachable state:

```sh
gosu postgres pgbackrest \
  --stanza="$STANZA" \
  --archive-mode=off \
  --target-action=promote \
  restore
```

Restore to a timestamp:

```sh
export RECOVERY_TARGET='<timestamp-with-timezone>'

gosu postgres pgbackrest \
  --stanza="$STANZA" \
  --archive-mode=off \
  --type=time \
  --target="$RECOVERY_TARGET" \
  --target-action=promote \
  restore
```

## 5. Validate in isolation

Locate `pg_ctl` from the deployed PostgreSQL installation instead of relying on
`PATH` or a hard-coded major version:

```sh
export PG_CTL="$(
  find /usr/lib/postgresql -type f -path '*/bin/pg_ctl' -print -quit
)"
test -x "$PG_CTL"
```

Start PostgreSQL on a Unix socket, in default read-only mode, with WAL
archiving disabled:

```sh
gosu postgres "$PG_CTL" \
  -D "$PGDATA" \
  -l /tmp/postgresql.log \
  -o "-c config_file=/etc/postgresql/postgresql.conf -c listen_addresses='' -c unix_socket_directories=/tmp -c default_transaction_read_only=on -c archive_mode=off" \
  -w start
```

If startup fails:

```sh
tail -n 200 /tmp/postgresql.log
df -h "$VOLUME_MOUNT"
```

Verify the recovery state:

```sh
gosu postgres psql -h /tmp -U "$DB_USER" -d "$DB_NAME" -x -c "
SELECT version(),
       pg_is_in_recovery(),
       current_setting('transaction_read_only'),
       pg_last_wal_replay_lsn(),
       pg_last_xact_replay_timestamp();
"
```

Expect `pg_is_in_recovery = false` and `transaction_read_only = on`. Then check
the databases, schemas, critical application records, and incident-specific
invariants. At minimum, run a schema-only dump to verify that the catalogs can
be read:

```sh
gosu postgres pg_dump \
  -h /tmp \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file=/tmp/restored-schema.sql
```

Record the actual recovery time, LSN, backup set, validation results, recovery
duration, and any WAL warnings.

## 6. Cut over production

Stop the validation server:

```sh
gosu postgres "$PG_CTL" -D "$PGDATA" -m fast -w stop
exit
```

Stop and destroy the temporary Machine to release the restored volume. This
destroys only the Machine, not the volume:

```sh
fly machine stop "$RESTORE_MACHINE_ID" --app "$APP"
fly machine destroy "$RESTORE_MACHINE_ID" --app "$APP"
fly volumes list --app "$APP"
```

Confirm that the old Machine is still stopped, then clone its production
configuration while explicitly attaching the restored volume:

```sh
fly machine status "$OLD_MACHINE_ID" --app "$APP"

fly machine clone "$OLD_MACHINE_ID" \
  --app "$APP" \
  --region "$REGION" \
  --name '<replacement-machine-name>' \
  --attach-volume "$RESTORE_VOLUME_ID:$VOLUME_MOUNT"
```

Record and inspect the replacement:

```sh
export NEW_MACHINE_ID='<replacement-machine-id>'
fly machine status "$NEW_MACHINE_ID" --app "$APP" --display-config
```

Compare it with the production configuration saved in step 1. At minimum,
confirm:

- the mounted volume is exactly `RESTORE_VOLUME_ID`;
- the image, command, and environment are correct;
- services and secrets are present;
- the old Machine remains stopped.

Observe startup and connect to the replacement:

```sh
fly logs --app "$APP"
fly status --app "$APP"
fly ssh console --app "$APP" --machine "$NEW_MACHINE_ID"
```

Verify that production is writable and WAL archiving works:

```sh
gosu postgres psql -U "$DB_USER" -d "$DB_NAME" -x -c "
SELECT pg_is_in_recovery(),
       current_setting('transaction_read_only');
"

gosu postgres pgbackrest --stanza="$STANZA" check
```

Expect `pg_is_in_recovery = false` and `transaction_read_only = off`. Disable
maintenance mode only after application read and write checks pass.

If the old Machine no longer exists, do not run an unreviewed `fly deploy`
while multiple matching volumes exist. Recreate the Machine from the saved
configuration and explicitly name the restored volume ID.

## 7. Establish a new backup baseline

After the restored cluster takes production traffic, create a full backup as
soon as possible:

```sh
gosu postgres pgbackrest \
  --stanza="$STANZA" \
  --type=full \
  backup

gosu postgres pgbackrest --stanza="$STANZA" check
gosu postgres pgbackrest --stanza="$STANZA" info
```

Also verify that archive failures are not increasing, the backup completed,
and disk usage is stable.

## 8. Rollback and cleanup

Before the replacement accepts writes, rollback by stopping it and starting
the old Machine:

```sh
fly machine stop "$NEW_MACHINE_ID" --app "$APP" --timeout 120
fly machine start "$OLD_MACHINE_ID" --app "$APP"
```

Do not use this rollback after the replacement has accepted writes; the old
volume is stale.

After the observation period, destroy the old Machine before the next normal
deployment so it cannot be started accidentally. Retain its volume for the
agreed rollback period:

```sh
fly machine status "$OLD_MACHINE_ID" --app "$APP" --display-config
fly machine destroy "$OLD_MACHINE_ID" --app "$APP"
```

Volume deletion is irreversible. Review the ID separately before deleting it:

```sh
fly volumes list --app "$APP"
fly volumes destroy "$OLD_VOLUME_ID" --app "$APP"
```

## References

- [pgBackRest command reference](https://pgbackrest.org/command.html)
- [Fly Machine run](https://fly.io/docs/machines/flyctl/fly-machine-run/)
- [Fly volume management](https://fly.io/docs/volumes/volume-manage/)
- [Fly Machine clone](https://fly.io/docs/flyctl/machine-clone/)
