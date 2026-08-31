WITH component AS (
    INSERT INTO entry_components (entry_id, component_type, payload_type)
    VALUES ($1, $2, 'Json')
    RETURNING entry_id, component_type, payload_type
)
INSERT INTO entry_components_json (
    entry_id,
    component_type,
    payload_type,
    data,
    schema_version
)
SELECT entry_id, component_type, payload_type, $3, COALESCE($4, 1)
FROM component
RETURNING schema_version;
