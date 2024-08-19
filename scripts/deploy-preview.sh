#!/usr/bin/env bash
# Deploy the current commit to Cloudflare Pages preview environment

# https://app-preview.boluo.chat
# https://old-preview.boluo.chat
# https://site-preview.boluo.chat

git push -f origin "$(git symbolic-ref --short HEAD)":preview
