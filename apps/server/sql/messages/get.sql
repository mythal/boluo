SELECT
    msg AS "message!: Message",
    (msg.whisper_to_users IS NOT NULL
        AND cm.is_master IS NOT TRUE
        AND ($2 IS NULL
            OR $2 <> ALL (msg.whisper_to_users))) AS "should_hide!"
FROM
    messages msg
    LEFT JOIN channel_members cm ON cm.channel_id = msg.channel_id
        AND cm.user_id = $2
WHERE
    msg.id = $1
    AND msg.deleted = FALSE
LIMIT 1;

