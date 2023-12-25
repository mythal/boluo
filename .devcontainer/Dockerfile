FROM ubuntu:latest
RUN apt update -y
RUN apt install -y curl xz-utils git direnv && mkdir /nix
RUN \
  useradd -m -s /bin/bash -u 1000 dev;\
  chown dev /nix;\
  mkdir -p /etc/nix;\
  echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf
ENV USER=dev
USER dev
WORKDIR /home/dev
RUN curl -L https://nixos.org/nix/install | sh -s -- --no-daemon;
ENV PATH="/home/dev/.nix-profile/bin:${PATH}"

ARG PNPM_STORE_DIR=/home/dev/.local/share/pnpm
ENV PNPM_STORE_DIR=${PNPM_STORE_DIR}
RUN mkdir -p "${PNPM_STORE_DIR}"
COPY --chown=dev:dev flake.lock flake.nix rust-toolchain.toml ./
RUN nix develop --command bash -c "pnpm config set store-dir ${PNPM_STORE_DIR}" && rm flake.lock flake.nix rust-toolchain.toml
