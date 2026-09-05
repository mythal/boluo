UPDATE
    messages
SET
    deleted = TRUE
WHERE
    id = $1
    AND deleted = FALSE
RETURNING
    messages AS "message!: Message",
    (whisper_to_users IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM channel_members cm
            WHERE cm.channel_id = messages.channel_id
                AND cm.user_id = $2
                AND cm.is_master IS TRUE
        )
        AND ($2::uuid IS NULL OR $2 <> ALL (whisper_to_users))) AS "should_hide!";
