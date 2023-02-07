SELECT is_master
FROM channel_members cm
WHERE cm.user_id = $1 AND cm.channel_id = $2 AND cm.is_joined
LIMIT 1;
