SELECT
    c AS "channel!: Channel",
    cm AS "member?: ChannelMember"
FROM
    channels c
    LEFT JOIN channel_members cm ON cm.channel_id = c.id
        AND cm.user_id = $2
        AND cm.is_joined
    LEFT JOIN space_members sm ON sm.user_id = $2
        AND sm.space_id = c.space_id
WHERE
    c.space_id = $1
    AND c.deleted = FALSE
    AND (c.is_public
        OR cm.is_joined
        OR sm.is_admin)
ORDER BY
    c.created;
