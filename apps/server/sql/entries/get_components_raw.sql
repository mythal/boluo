SELECT
    component_type AS "component_type!: CompactString",
    data::text AS "data!",
    schema_version,
    version,
    modified
FROM entry_components
WHERE entry_id = $1
ORDER BY component_type;
