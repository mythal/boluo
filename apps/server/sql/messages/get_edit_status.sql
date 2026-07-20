SELECT
    (msg.id IS NOT NULL) AS "message_exists!",
    (ch.id IS NOT NULL) AS "channel_exists!",
    COALESCE(
        cm.user_id IS NOT NULL
        AND sm.user_id IS NOT NULL
        AND (ch.is_document OR msg.sender_id = $2),
        FALSE
    ) AS "can_edit!",
    COALESCE(
        $3::timestamptz IS NULL OR msg.modified = $3,
        FALSE
    ) AS "version_matches!"
FROM
    (SELECT 1) singleton
    LEFT JOIN messages msg ON msg.id = $1
        AND msg.deleted = FALSE
    LEFT JOIN channels ch ON ch.id = msg.channel_id
        AND ch.deleted = FALSE
    LEFT JOIN channel_members cm ON cm.channel_id = msg.channel_id
        AND cm.user_id = $2
        AND cm.is_joined
    LEFT JOIN space_members sm ON sm.space_id = ch.space_id
        AND sm.user_id = $2
LIMIT 1;
