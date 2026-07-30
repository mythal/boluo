INSERT INTO entry_components (
    entry_id,
    component_type,
    data,
    schema_version
)
VALUES ($1, $2, $3, COALESCE($4, 1))
ON CONFLICT (entry_id, component_type) DO NOTHING
RETURNING schema_version;
