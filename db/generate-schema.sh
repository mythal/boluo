#!/usr/bin/env bash

# docker-compose exec db
pg_dump --schema-only -U postgres --no-owner --no-privileges boluo > db/schema.sql
