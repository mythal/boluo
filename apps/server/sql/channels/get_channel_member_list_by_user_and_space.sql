SELECT m as "member!: ChannelMember"
FROM channel_members m
    INNER JOIN channels c on c.id = m.channel_id
WHERE m.user_id = $1 AND c.space_id = $2 AND m.is_joined;
