SELECT asset_component.asset_id
FROM entries entry
JOIN entry_components component
  ON component.entry_id = entry.id
 AND component.component_type = $2
 AND component.payload_type = 'Asset'
JOIN entry_components_asset asset_component
  ON asset_component.entry_id = component.entry_id
 AND asset_component.component_type = component.component_type
 AND asset_component.payload_type = component.payload_type
WHERE entry.scope_id = $1
ORDER BY entry.pos, entry.id
LIMIT 1;
