#!/usr/bin/env bash
set -euo pipefail

# Named volumes are created as root; make their roots writable by the remote user.
sudo chown "$(id -u):$(id -g)" node_modules target "$HOME/.cargo"

# Use the flake's Node.js/npm so local setup matches the Nix development shell.
nix develop --no-update-lock-file --command npm ci
