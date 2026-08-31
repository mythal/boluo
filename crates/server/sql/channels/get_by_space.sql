SELECT
    channel AS "channel!: Channel"
FROM
    channels channel
WHERE
    channel.space_id = $1
    AND deleted = FALSE
ORDER BY
    channel.created;

