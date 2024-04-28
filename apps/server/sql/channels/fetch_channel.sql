SELECT
    ch AS "channel!: Channel"
FROM
    channels ch
WHERE
    ch.id = $1
    AND deleted = FALSE
LIMIT 1;

