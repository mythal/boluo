alias fmt := format
alias gen := generate

build projects="*":
    pnpm exec nx run-many --target=build --output-style="stream" --projects={{projects}}

check:
    pnpm exec nx run-many --target=check

lint:
    pnpm exec nx run-many --target=lint
    pnpm exec dprint check
    cargo fmt --check

dev projects="*":
    pnpm exec nx run-many --target=dev --projects={{projects}} --parallel=16

graph:
    pnpm exec nx graph

server:
    cargo run -p server

test:
    cargo test

install:
    pnpm install

format:
    pnpm exec dprint fmt
    cargo fmt

generate:
    pnpm exec nx run-many --target=generate
