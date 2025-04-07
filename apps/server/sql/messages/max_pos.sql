SELECT
    pos_p,
    pos_q,
    id
FROM
    messages msg
WHERE
    channel_id = $1
ORDER BY
    msg.pos DESC
LIMIT 1;

