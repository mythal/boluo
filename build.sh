#!/usr/bin/env bash

cd "$(dirname "$0")/" || exit

cd common/ || exit
yarn build

cd ../web || exit
yarn upgrade boluo-common --latest
rm -rf .cache
rm -rf dist
yarn build

cd ../server || exit
yarn upgrade boluo-common --latest
rm -rf dist
yarn build
