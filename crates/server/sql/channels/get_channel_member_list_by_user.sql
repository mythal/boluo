SELECT
    m AS "member!: ChannelMember"
FROM
    channel_members m
WHERE
    m.user_id = $1
    AND m.is_joined;
