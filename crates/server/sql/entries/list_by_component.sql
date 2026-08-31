SELECT
    entry.id,
    entry.scope_id,
    primary_identifier.value::text AS "key!: CompactString",
    ARRAY(
        SELECT identifier.value::text
        FROM entry_identifiers identifier
        WHERE identifier.entry_id = entry.id
          AND identifier.kind = 'Alias'
        ORDER BY identifier.value
    ) AS "aliases!: Vec<CompactString>",
    entry.display_name AS "display_name!: CompactString",
    entry.reference_note_id,
    entry.tags AS "tags!: Vec<CompactString>",
    entry.pos_p,
    entry.pos_q,
    entry.pos AS "pos!",
    entry.metadata_version AS "metadata_version!",
    entry.components_version AS "components_version!",
    entry.created,
    entry.modified AS entry_modified,
    component.component_type AS "component_type!: CompactString",
    component.payload_type AS "payload_type!: EntryComponentPayloadType",
    json_component.data AS "json_data?",
    json_component.schema_version AS "json_schema_version?",
    asset_component.asset_id AS "asset_id?",
    component.version AS component_version,
    component.modified AS component_modified
FROM entries entry
JOIN entry_identifiers primary_identifier
  ON primary_identifier.entry_id = entry.id
 AND primary_identifier.kind = 'Primary'
JOIN entry_components component
  ON component.entry_id = entry.id
 AND component.component_type = $2
LEFT JOIN entry_components_json json_component
  ON json_component.entry_id = component.entry_id
 AND json_component.component_type = component.component_type
 AND json_component.payload_type = component.payload_type
LEFT JOIN entry_components_asset asset_component
  ON asset_component.entry_id = component.entry_id
 AND asset_component.component_type = component.component_type
 AND asset_component.payload_type = component.payload_type
WHERE entry.scope_id = $1
ORDER BY entry.pos, entry.id;
