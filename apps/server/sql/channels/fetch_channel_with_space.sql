SELECT
    ch AS "channel!: Channel",
    s AS "space!: Space"
FROM
    channels ch
    INNER JOIN spaces s ON ch.space_id = s.id
WHERE
    ch.id = $1
    AND ch.deleted = FALSE
LIMIT 1;

