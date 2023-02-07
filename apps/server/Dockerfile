FROM rustlang/rust:nightly-buster AS builder
RUN cargo --version
ADD . /boluo
RUN cd /boluo && cargo build --release

FROM debian:buster AS server
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget gcc libssl-dev libc6-dev

COPY --from=builder /boluo/target/release/server /bin/server
COPY --from=builder /boluo/target/release/manage /bin/manage
