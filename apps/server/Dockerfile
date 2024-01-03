FROM rustlang/rust:nightly-buster AS builder
RUN cargo --version
ADD .env Cargo.lock Cargo.toml version.json /boluo/
ADD apps/server /boluo/apps/server/
RUN cd /boluo && cargo +nightly build --release

FROM debian:buster AS server
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget gcc libssl-dev libc6-dev

COPY --from=builder /boluo/target/release/server /bin/server
