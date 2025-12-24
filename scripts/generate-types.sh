#!/usr/bin/env bash

cargo run -p server -- --types
npm install
npm exec prettier -- --write ./packages/types/bindings.ts
cargo sqlx prepare --workspace -- --tests
