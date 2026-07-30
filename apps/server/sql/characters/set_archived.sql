UPDATE characters
SET archived_at = CASE WHEN $3 THEN now() ELSE NULL END,
    version = uuidv7(),
    modified = now()
WHERE id = $1
  AND version = $2
  AND (archived_at IS NOT NULL) IS DISTINCT FROM $3
RETURNING id;
