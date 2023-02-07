SELECT cm, sm
FROM channel_members cm
    INNER JOIN channels ch ON cm.channel_id = ch.id AND ch.deleted = false
    INNER JOIN space_members sm ON sm.space_id = ch.space_id AND sm.user_id = cm.user_id
WHERE cm.user_id = $1 AND cm.channel_id = $2 AND cm.is_joined
LIMIT 1;
