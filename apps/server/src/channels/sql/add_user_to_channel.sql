WITH add(channel_members) AS (
    INSERT INTO channel_members (user_id, channel_id, character_name, is_master, is_joined)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (user_id, channel_id) DO UPDATE SET is_joined = true, character_name = $3
        RETURNING channel_members
)
SELECT true AS created, channel_members FROM add
UNION ALL
SELECT false AS created, channel_members FROM channel_members
WHERE user_id = $1 AND channel_id = $2
LIMIT 1;
