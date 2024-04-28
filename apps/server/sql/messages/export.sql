SELECT
    msg AS "message!: Message"
FROM
    messages msg
WHERE
    msg.channel_id = $1
    AND msg.deleted = FALSE
    -- FIXME: Deprecated "order_date"
    AND msg.order_date > coalesce($2, to_timestamp(0)::timestamptz)
ORDER BY
    msg.pos;

