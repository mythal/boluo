SELECT user_id, text_color
FROM channel_members cm
WHERE cm.channel_id = $1 AND cm.text_color IS NOT NULL;