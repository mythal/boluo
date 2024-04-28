UPDATE messages
SET name         = $2,
    text         = $3,
    entities     = $4,
    in_game      = $5,
    is_action    = $6,
    media_id     = $7,
    modified     = (now() at time zone 'utc'),
    color        = $8
WHERE id = $1
RETURNING messages as "message!: Message";
