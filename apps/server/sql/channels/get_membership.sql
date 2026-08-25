SELECT
    cm.is_master
FROM
    channel_members cm
    INNER JOIN channels ch ON ch.id = cm.channel_id
        AND ch.deleted = FALSE
    INNER JOIN space_members sm ON sm.space_id = ch.space_id
        AND sm.user_id = cm.user_id
WHERE
    cm.user_id = $1
    AND cm.channel_id = $2
    AND ch.space_id = $3
    AND cm.is_joined
LIMIT 1;
