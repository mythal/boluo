WITH ADD (
    channel_members
) AS (
INSERT INTO channel_members (user_id, channel_id, character_name, is_master, is_joined)
        SELECT
            $1,
            channel.id,
            $3,
            $4,
            TRUE
        FROM
            channels channel
            INNER JOIN space_members space_member
                ON space_member.space_id = channel.space_id
                AND space_member.user_id = $1
        WHERE
            channel.id = $2
            AND channel.deleted = FALSE
    ON CONFLICT (user_id, channel_id)
        DO UPDATE SET
            is_joined = TRUE, character_name = $3
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
