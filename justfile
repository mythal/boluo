alias fmt := format
alias gen := generate

build projects="*":
    npm exec nx run-many -- --target=build --projects={{projects}}

lint projects="*":
    npm exec nx run-many -- --target=lint --projects={{projects}}

dev projects="*":
    npm exec nx run-many -- --target=dev --projects={{projects}}

graph:
    npm exec nx graph

server:
    cargo run -p server

test:
    cargo test

install:
    npm install

format:
    dprint fmt

generate:
    npm exec nx run-many -- --target=generate
