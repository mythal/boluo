# [Boluo](https://github.com/mythal/boluo) Server

A chat tool made for play RPG.

## Set Up

First, set up Redis and Postgres database (and install [pg_rational](https://github.com/begriffs/pg_rational)), then execute `schema.sql` on the database.

```bash
createdb boluo
psql -U postgres boluo < schema.sql
cp .env.dev.template .env # edit it
./create-test-database.sh
cargo test
```

## Generate TypeScript interfaces

```
cargo test export_bindings_
```

(see [ts-rs #62](https://github.com/Aleph-Alpha/ts-rs/issues/62))
