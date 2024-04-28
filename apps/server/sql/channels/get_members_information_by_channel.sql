SELECT
    cm AS "channel!: ChannelMember",
    sm AS "space!: SpaceMember",
    u AS "user!: User"
FROM
    channel_members cm
    INNER JOIN channels ch ON cm.channel_id = ch.id
        AND ch.deleted = FALSE
    INNER JOIN space_members sm ON sm.space_id = ch.space_id
        AND sm.user_id = cm.user_id
    INNER JOIN users u ON cm.user_id = u.id
WHERE
    cm.channel_id = $1
    AND cm.is_joined;

