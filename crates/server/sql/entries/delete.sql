DELETE FROM entries
WHERE scope_id = $1
  AND id = $2
  AND metadata_version = $3;
