SELECT COALESCE(max(pos), 42.0)
FROM messages
WHERE channel_id = $1;