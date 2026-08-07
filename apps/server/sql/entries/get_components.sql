SELECT
    component.component_type AS "component_type!: CompactString",
    component.payload_type AS "payload_type!: EntryComponentPayloadType",
    json_component.data AS "json_data?",
    json_component.schema_version AS "json_schema_version?",
    asset_component.asset_id AS "asset_id?",
    component.version,
    component.modified
FROM entry_components component
LEFT JOIN entry_components_json json_component
  ON json_component.entry_id = component.entry_id
 AND json_component.component_type = component.component_type
 AND json_component.payload_type = component.payload_type
LEFT JOIN entry_components_asset asset_component
  ON asset_component.entry_id = component.entry_id
 AND asset_component.component_type = component.component_type
 AND asset_component.payload_type = component.payload_type
WHERE component.entry_id = $1
ORDER BY component.component_type;
