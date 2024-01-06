#!/usr/bin/env bash

# see [ts-rs #62](https://github.com/Aleph-Alpha/ts-rs/issues/62)
cargo test export_bindings_

npm exec prettier -- --write ./apps/server/bindings/**/*
