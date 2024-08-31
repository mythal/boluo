SELECT
    msg AS "message!: Message"
FROM
    messages msg
WHERE
    msg.channel_id = $1
    AND msg.deleted = FALSE
    AND msg.created > coalesce($2, to_timestamp(0)::timestamptz)
ORDER BY
    msg.pos;

