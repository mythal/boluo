WITH target AS (
    SELECT entry.scope_id, scope.space_id, asset.id AS asset_id
    FROM entries entry
    JOIN scopes scope ON scope.id = entry.scope_id
    JOIN assets asset ON asset.id = $3 AND asset.space_id = scope.space_id
    WHERE entry.id = $1
), component AS (
    INSERT INTO entry_components (entry_id, component_type, payload_type)
    SELECT $1, $2, 'Asset'
    FROM target
    RETURNING entry_id, component_type, payload_type
)
INSERT INTO entry_components_asset (
    entry_id,
    component_type,
    payload_type,
    scope_id,
    space_id,
    asset_id
)
SELECT
    component.entry_id,
    component.component_type,
    component.payload_type,
    target.scope_id,
    target.space_id,
    target.asset_id
FROM component
JOIN target ON true
RETURNING asset_id;
