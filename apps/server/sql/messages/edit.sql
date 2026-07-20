UPDATE
    messages msg
SET
    name = $2,
    text = $3,
    entities = $4,
    in_game = $5,
    is_action = $6,
    media_id = $7,
    modified = now(),
    color = $8,
    rev = rev + 1
FROM
    channels ch
    INNER JOIN channel_members cm ON cm.channel_id = ch.id
        AND cm.user_id = $10
        AND cm.is_joined
    INNER JOIN space_members sm ON sm.space_id = ch.space_id
        AND sm.user_id = $10
WHERE
    msg.id = $1
    AND msg.deleted = FALSE
    AND ch.id = msg.channel_id
    AND ch.deleted = FALSE
    AND (ch.is_document OR msg.sender_id = $10)
    AND ($9::timestamptz IS NULL OR msg.modified = $9)
RETURNING
    msg AS "message!: Message",
    ch.space_id AS "space_id!";
