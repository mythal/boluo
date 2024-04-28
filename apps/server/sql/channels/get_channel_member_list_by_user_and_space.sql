SELECT
    m AS "member!: ChannelMember"
FROM
    channel_members m
    INNER JOIN channels c ON c.id = m.channel_id
WHERE
    m.user_id = $1
    AND c.space_id = $2
    AND m.is_joined;

