WITH ADD (
    channel_members
) AS (
INSERT INTO channel_members (user_id, channel_id, character_name, is_master, is_joined, character_id)
        SELECT
            $1,
            channel.id,
            $3,
            $4,
            TRUE,
            target_character.id
        FROM
            channels channel
            INNER JOIN space_members space_member
                ON space_member.space_id = channel.space_id
                AND space_member.user_id = $1
            LEFT JOIN characters target_character
                ON target_character.id = $5
                AND target_character.space_id = channel.space_id
                AND target_character.archived_at IS NULL
        WHERE
            channel.id = $2
            AND channel.deleted = FALSE
            AND ($5::uuid IS NULL OR target_character.id IS NOT NULL)
    ON CONFLICT (user_id, channel_id)
        DO UPDATE SET
            is_joined = TRUE,
            character_name = $3,
            character_id = EXCLUDED.character_id
        RETURNING
            channel_members)
        SELECT
            TRUE AS "created!",
            channel_members AS "member!: ChannelMember"
        FROM
            ADD
        UNION ALL
        SELECT
            FALSE AS "created!",
            channel_members AS "member!: ChannelMember"
        FROM
            channel_members
        WHERE
            user_id = $1
            AND channel_id = $2
        LIMIT 1;
