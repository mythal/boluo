SELECT
    channel AS "channel!: Channel",
    member AS "member!: ChannelMember",
    bound_user AS "user!: User"
FROM channel_members member
JOIN channels channel
    ON channel.id = member.channel_id
JOIN users bound_user
    ON bound_user.id = member.user_id
JOIN spaces space
    ON space.id = channel.space_id
LEFT JOIN channel_members viewer_member
    ON viewer_member.channel_id = channel.id
    AND viewer_member.user_id = $3
    AND viewer_member.is_joined
LEFT JOIN space_members viewer_space_member
    ON viewer_space_member.space_id = channel.space_id
    AND viewer_space_member.user_id = $3
WHERE member.character_id = $1
    AND channel.space_id = $2
    AND member.is_joined
    AND NOT channel.deleted
    AND (
        channel.is_public
        OR viewer_member.is_joined
        OR viewer_space_member.is_admin
        OR space.owner_id = $3
    )
ORDER BY member.join_date, member.user_id, channel.id;
