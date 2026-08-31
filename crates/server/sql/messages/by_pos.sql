SELECT
    msg AS "message!: Message"
FROM
    messages msg
WHERE
    msg.channel_id = $1
    AND msg.pos_p = $2
    AND msg.pos_q = $3
LIMIT 1;

