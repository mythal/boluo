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
