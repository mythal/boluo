UPDATE
    messages msg
SET
    name = CASE WHEN $2 THEN $3 ELSE msg.name END,
    character_id = CASE WHEN $2 THEN $4 ELSE msg.character_id END,
    portrait_id = CASE WHEN $2 THEN $5 ELSE msg.portrait_id END,
    text = $6,
    entities = $7,
    in_game = CASE WHEN $2 THEN $8 ELSE msg.in_game END,
    is_action = $9,
    media_id = $10,
    modified = now(),
    color = CASE WHEN $2 THEN $11 ELSE msg.color END,
    rev = rev + 1
FROM
    channels ch
    INNER JOIN channel_members cm ON cm.channel_id = ch.id
        AND cm.user_id = $13
        AND cm.is_joined
    INNER JOIN space_members sm ON sm.space_id = ch.space_id
        AND sm.user_id = $13
WHERE
    msg.id = $1
    AND ch.id = msg.channel_id
    AND ch.deleted = FALSE
    AND ch.space_id = $14
    AND (ch.is_document OR msg.sender_id = $13)
    AND ($12::timestamptz IS NULL OR msg.modified = $12)
RETURNING
    msg AS "message!: Message",
    ch.space_id AS "space_id!";
