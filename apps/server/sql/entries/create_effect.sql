INSERT INTO entry_effects (
    id,
    space_id,
    scope_id,
    operator_id
)
SELECT
    $1,
    scope.space_id,
    scope.id,
    $3
FROM scopes scope
WHERE scope.id = $2
  AND scope.space_id = $4
RETURNING
    id,
    space_id,
    scope_id,
    operator_id,
    created,
    message_id;
