SELECT
    component_type,
    data,
    schema_version,
    version,
    modified
FROM entry_components
WHERE entry_id = $1
ORDER BY component_type;
