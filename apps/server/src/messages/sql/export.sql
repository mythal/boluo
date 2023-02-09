SELECT msg
FROM messages msg
WHERE msg.channel_id = $1
  AND msg.deleted = false
  AND msg.order_date > coalesce($2, to_timestamp(0)::timestamptz)
ORDER BY msg.pos;

