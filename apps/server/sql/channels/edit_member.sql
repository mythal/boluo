UPDATE channel_members member
SET
    character_name = COALESCE($3, character_name),
    text_color = COALESCE($4, text_color),
    character_id = CASE WHEN $5 THEN $6 ELSE character_id END
FROM channels channel
LEFT JOIN characters target_character
    ON target_character.id = $6
    AND target_character.space_id = channel.space_id
    AND target_character.archived_at IS NULL
WHERE
    member.user_id = $1
    AND member.channel_id = $2
    AND member.is_joined
    AND channel.id = member.channel_id
    AND (NOT $5 OR $6::uuid IS NULL OR target_character.id IS NOT NULL)
RETURNING
    member AS "member!: ChannelMember";
