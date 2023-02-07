SELECT ch.id, coalesce(max(m.pos), 42)
FROM channels ch LEFT JOIN messages m ON ch.id = m.channel_id
GROUP BY ch.id;