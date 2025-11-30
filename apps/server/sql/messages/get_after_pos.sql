SELECT
    msg AS "message!: Message"
FROM
    messages msg
WHERE
    msg.channel_id = $1
    AND msg.deleted = FALSE
    AND ($2::float8 IS NULL OR msg.pos > $2)
ORDER BY
    msg.pos ASC
LIMIT $3;
