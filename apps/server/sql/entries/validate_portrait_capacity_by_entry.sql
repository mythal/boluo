SELECT (
    SELECT COUNT(*)
    FROM entry_components_asset component
    WHERE component.space_id = target_scope.space_id
      AND component.scope_id = target_scope.id
      AND component.component_type = $3
) < $2 AS "has_capacity!"
FROM entries entry
JOIN scopes target_scope ON target_scope.id = entry.scope_id
WHERE entry.id = $1;
