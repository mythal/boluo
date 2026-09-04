# syntax=docker/dockerfile:1.7

FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ARG NIX_VERSION=2.35.2

USER root

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install --yes --no-install-recommends xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Syscall filtering is disabled while building because QEMU user emulation cannot
# load Nix's seccomp program.
# https://github.com/NixOS/nix/issues/5258
RUN mkdir -p /etc/nix \
    && printf '%s\n' \
      'sandbox = false' \
      'filter-syscalls = false' \
      'experimental-features = nix-command flakes' \
      > /etc/nix/nix.conf \
    && curl --fail --location --show-error --silent \
      "https://releases.nixos.org/nix/nix-${NIX_VERSION}/install" \
      --output /tmp/install-nix \
    && sh /tmp/install-nix --daemon \
    && rm /tmp/install-nix \
    && printf '%s\n' \
      'sandbox = false' \
      'filter-syscalls = false' \
      'experimental-features = nix-command flakes' \
      >> /etc/nix/nix.conf

ENV PATH="/nix/var/nix/profiles/default/bin:/nix/var/nix/profiles/default/sbin:${PATH}"

COPY --chmod=0755 .devcontainer/nix-entrypoint.sh /usr/local/share/nix-entrypoint.sh
COPY flake.nix flake.lock /tmp/boluo-flake/
RUN chown -R vscode:vscode /tmp/boluo-flake

USER vscode

# Keep the development shell closure as a GC root. Runtime `nix develop`
# still evaluates the checked-out flake, but normally downloads nothing.
RUN mkdir -p /home/vscode/.local/state/nix/profiles \
    && /usr/local/share/nix-entrypoint.sh \
      nix develop --no-update-lock-file /tmp/boluo-flake \
      --profile /home/vscode/.local/state/nix/profiles/boluo-dev \
      --command true

USER root
RUN sed -i '/^filter-syscalls = false$/d' /etc/nix/nix.conf \
    && rm -rf /tmp/boluo-flake

USER vscode

ENTRYPOINT ["/usr/local/share/nix-entrypoint.sh"]
