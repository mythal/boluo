SELECT
    component.payload_type AS "payload_type!: EntryComponentPayloadType",
    component.version,
    json_component.schema_version AS "schema_version?",
    (json_component.entry_id IS NOT NULL) AS "json_exists!",
    (asset_component.entry_id IS NOT NULL) AS "asset_exists!"
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
  AND component.component_type = $2
FOR UPDATE OF component;
