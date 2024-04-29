SELECT
    ch.id AS "channel_id!",
    coalesce(max(m.pos), 42) AS "max_pos!"
FROM
    channels ch
    LEFT JOIN messages m ON ch.id = m.channel_id
GROUP BY
    ch.id;

