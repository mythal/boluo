#!/usr/bin/env bash

pg_format -i apps/server/schema.sql

pg_format -i apps/server/sql/*/*.sql
