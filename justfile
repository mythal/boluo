alias fmt := format

build target="*":
    npm exec nx run-many -- --target=build --projects={{target}}

lint target="*":
    npm exec nx run-many -- --target=lint --projects={{target}}

dev target="*":
    npm exec nx run-many -- --target=dev --projects={{target}}

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
