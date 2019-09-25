#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/"

cd common/
yarn install
yarn build

cd ../web
yarn install
yarn upgrade boluo-common --latest
rm -rf .cache
rm -rf dist
yarn build

cd ../server
yarn install
yarn upgrade boluo-common --latest
rm -rf dist
yarn build
