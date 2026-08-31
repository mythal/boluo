SELECT
    m AS "member!: ChannelMember",
    u AS "user!: User"
FROM
    channel_members m
    INNER JOIN users u ON u.id = m.user_id
WHERE
    channel_id = $1
    AND ($2
        OR is_joined);

