#!/usr/bin/env bash

git push -f origin "$(git symbolic-ref --short HEAD)":preview
