SELECT
    member AS "member!: ChannelMember"
FROM
    channel_members member
    INNER JOIN channels channel ON channel.id = member.channel_id
WHERE
    channel.space_id = $1
    AND channel.deleted = FALSE
    AND member.is_joined = TRUE;
