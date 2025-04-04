SELECT
    ch AS "channel!: Channel"
FROM
    channels ch
WHERE
    ch.id = ANY($1)
    AND deleted = FALSE;
