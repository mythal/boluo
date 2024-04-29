WITH ADD (
    channel_members
) AS (
INSERT INTO channel_members (user_id, channel_id, character_name, is_master, is_joined)
        VALUES ($1, $2, $3, $4, TRUE)
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

