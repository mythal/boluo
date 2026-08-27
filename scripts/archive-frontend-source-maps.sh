#!/usr/bin/env bash

set -euo pipefail

output_directory="${1:-.tmp/source-maps}"
mkdir -p "$output_directory"

archive_source_maps() {
  local application="$1"
  local source_directory="$2"
  local path_transform="${3:-}"
  local file_list
  local -a transform_arguments=()

  file_list="$(mktemp "$output_directory/${application}.files.XXXXXX")"
  find "$source_directory" -type f -name '*.map' -printf '%P\0' | sort -z > "$file_list"

  if [[ ! -s "$file_list" ]]; then
    echo "No source maps found for $application in $source_directory" >&2
    rm -f "$file_list"
    return 1
  fi

  if [[ -n "$path_transform" ]]; then
    transform_arguments+=(--transform "$path_transform")
  fi

  tar \
    --create \
    --file=- \
    --directory="$source_directory" \
    --null \
    --files-from="$file_list" \
    "${transform_arguments[@]}" | gzip -9 > "$output_directory/$application.tar.gz"

  rm -f "$file_list"
}

archive_source_maps legacy apps/legacy/dist
archive_source_maps spa apps/spa/out
archive_source_maps site apps/site/.next/static 's,^,_next/static/,'
