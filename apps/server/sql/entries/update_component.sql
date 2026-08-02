UPDATE entry_components
SET data = $4,
    schema_version = COALESCE($5, schema_version),
    version = uuidv7(),
    modified = now()
WHERE entry_id = $1
  AND component_type = $2
  AND version = $3
RETURNING schema_version;
