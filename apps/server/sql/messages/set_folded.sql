UPDATE messages
SET folded       = $2,
    modified     = (now() at time zone 'utc')
WHERE id = $1
RETURNING messages as "message!: Message";
