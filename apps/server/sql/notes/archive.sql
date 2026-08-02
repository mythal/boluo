UPDATE notes
SET archived_at = now(),
    modified = now()
WHERE space_id = $1
  AND id = $2
  AND revision = $3
  AND archived_at IS NULL;
