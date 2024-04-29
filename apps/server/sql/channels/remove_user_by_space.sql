UPDATE
    channel_members cm
SET
    is_joined = FALSE
FROM
    channels ch
WHERE
    cm.user_id = $1
    AND ch.space_id = $2
    AND cm.channel_id = ch.id
RETURNING
    cm.channel_id;

