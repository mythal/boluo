#!/usr/bin/env bash

cargo run -p server -- --types

npm exec prettier -- --write ./packages/types/bindings.ts
cargo sqlx prepare --workspace -- --tests
