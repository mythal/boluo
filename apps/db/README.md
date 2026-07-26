# Database Configuration

## Schema

```
pg_dump --schema-only -U postgres --no-owner --no-privileges boluo > db/schema.sql
```

## Dump

```
pg_dump --username ... --host ... --dbname boluo --no-owner --no-privileges --schema public --file boluo-$(date +%Y%m%d).dump
```

## Restore

```
psql --username ... --host ... --dbname boluo --file boluo-$(date +%Y%m%d).dump
```

## Configuration Notes

1. Set up PgHero permissions according to [PgHero recommendations](https://github.com/ankane/pghero/blob/master/guides/Permissions.md).
2. Enabled `pg_stat_statements`.
3. Modified `pg_hba.conf`.
4. Enabled `io_uring`.
