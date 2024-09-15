SELECT
    c AS "channel!: Channel",
    cm AS "member!: ChannelMember"
FROM
    channel_members cm
    INNER JOIN channels c ON cm.channel_id = c.id
        AND c.deleted = FALSE
    INNER JOIN space_members sm ON cm.user_id = sm.user_id
        AND c.space_id = sm.space_id
WHERE
    cm.user_id = $1
    AND cm.is_joined;

