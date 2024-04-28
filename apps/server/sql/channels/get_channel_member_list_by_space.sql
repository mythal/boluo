SELECT
    m AS "member!: ChannelMember"
FROM
    channel_members m
    INNER JOIN channels c ON c.id = m.channel_id
WHERE
    c.space_id = $1
    AND m.is_joined;

