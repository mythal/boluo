UPDATE messages
SET name         = COALESCE($2, name),
    text         = COALESCE($3, text),
    entities     = COALESCE($4, entities),
    in_game      = COALESCE($5, in_game),
    is_action    = COALESCE($6, is_action),
    folded       = COALESCE($7, folded),
    media_id     = COALESCE($8, media_id),
    modified     = (now() at time zone 'utc')
WHERE id = $1
RETURNING messages;
