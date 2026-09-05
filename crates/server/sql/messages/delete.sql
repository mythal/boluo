-- Nothing selects from `archived`; a data-modifying CTE runs regardless.
WITH removed AS (
    DELETE FROM messages
    WHERE id = $1
    RETURNING
        messages AS message
),
archived AS (
INSERT INTO deleted_messages (id, channel_id, deleted_by, message)
    SELECT
        (removed.message).id,
        (removed.message).channel_id,
        $2,
        to_jsonb(removed.message)
    FROM
        removed
)
SELECT
    removed.message AS "message!: Message",
    ((removed.message).whisper_to_users IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM channel_members cm
            WHERE cm.channel_id = (removed.message).channel_id
                AND cm.user_id = $2
                AND cm.is_master IS TRUE
        )
        AND ($2::uuid IS NULL OR $2 <> ALL ((removed.message).whisper_to_users))) AS "should_hide!"
FROM
    removed;
