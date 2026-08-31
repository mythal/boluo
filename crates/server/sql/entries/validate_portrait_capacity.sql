SELECT (
    SELECT COUNT(*)
    FROM entry_components_asset component
    WHERE component.space_id = target_scope.space_id
      AND component.scope_id = target_scope.id
      AND component.component_type = $3
) < $2 AS "has_capacity!"
FROM scopes target_scope
WHERE target_scope.id = $1;
