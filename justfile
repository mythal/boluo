alias fmt := format
alias gen := generate

build projects="*":
    npm exec nx run-many -- --target=build --output-style="stream" --projects={{projects}}

lint:
    npm exec nx run-many -- --target=lint
    npm exec dprint check

dev projects="*":
    npm exec nx run-many -- --target=dev --projects={{projects}} --parallel=16

graph:
    npm exec nx graph

server:
    cargo run -p server

test:
    cargo test

install:
    npm install

format:
    npm exec dprint fmt

generate:
    npm exec nx run-many -- --target=generate
