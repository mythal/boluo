SELECT msg as "message!: Message"
FROM messages msg
WHERE msg.channel_id = $1
  AND msg.deleted = false
  AND ($2::float8 IS NULL OR msg.pos < $2) -- before
ORDER BY msg.pos DESC
LIMIT $3;
