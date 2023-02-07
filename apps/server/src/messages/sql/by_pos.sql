SELECT msg
FROM messages msg
WHERE msg.channel_id = $1
  AND msg.pos = $2
LIMIT 1;
