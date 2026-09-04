#!/usr/bin/env bash
set -euo pipefail

if ! pidof nix-daemon >/dev/null 2>&1; then
  nix_daemon_log="/tmp/nix-daemon-$(id -u).log"
  if [[ "$(id -u)" == 0 ]]; then
    /nix/var/nix/profiles/default/bin/nix-daemon >"$nix_daemon_log" 2>&1 &
  else
    sudo -n /nix/var/nix/profiles/default/bin/nix-daemon >"$nix_daemon_log" 2>&1 &
  fi

  for _ in {1..100}; do
    [[ -S /nix/var/nix/daemon-socket/socket ]] && break
    sleep 0.05
  done

  if [[ ! -S /nix/var/nix/daemon-socket/socket ]]; then
    cat "$nix_daemon_log" >&2
    exit 1
  fi
fi

exec "$@"
