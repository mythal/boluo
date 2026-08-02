WITH target_scopes AS MATERIALIZED (
    SELECT character.main_scope_id AS scope_id
    FROM characters character
    WHERE character.id = $1
    UNION ALL
    SELECT binding.scope_id
    FROM character_scopes binding
    WHERE binding.character_id = $1
),
deleted_character AS (
    DELETE FROM characters
    WHERE id = $1
    RETURNING id
)
DELETE FROM scopes scope
USING target_scopes, deleted_character
WHERE scope.id = target_scopes.scope_id
RETURNING scope.id AS "scope_id!";
