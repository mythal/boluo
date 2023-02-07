#!/bin/bash
dropdb --if-exists boluo_test
createdb boluo_test
psql boluo_test < schema.sql
