SELECT cm
FROM channel_members cm
    INNER JOIN channels ch ON cm.channel_id = ch.id AND ch.deleted = false
    INNER JOIN space_members sm ON ch.space_id = sm.space_id AND cm.user_id = sm.user_id
where cm.user_id = $1 AND cm.channel_id = $2 AND cm.is_joined
LIMIT 1;
