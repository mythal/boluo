WITH target_character AS MATERIALIZED (
    SELECT character.id, character.space_id, character.main_scope_id AS scope_id
    FROM characters character
    WHERE character.id = $1
      AND character.version = $2
    FOR UPDATE OF character
),
updated_scope AS MATERIALIZED (
    UPDATE scopes scope
    SET access_policy = ($8::text)::access_policy,
        access_channel_id = $9,
        version = uuidv7(),
        modified = now()
    FROM target_character character
    WHERE scope.id = character.scope_id
      AND scope.version = $3
    RETURNING scope.id
),
updated_character AS (
    UPDATE characters character
    SET name = $4,
        description = $5,
        color = $6,
        tags = $7,
        version = uuidv7(),
        modified = now()
    FROM target_character target, updated_scope scope
    WHERE character.id = target.id
      AND scope.id = target.scope_id
    RETURNING character.space_id
)
SELECT space_id
FROM updated_character;
