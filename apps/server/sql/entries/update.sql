UPDATE entries
SET display_name = $4,
    reference_note_id = $5,
    tags = $6,
    metadata_version = uuidv7(),
    modified = now()
WHERE scope_id = $1
  AND id = $2
  AND metadata_version = $3;
