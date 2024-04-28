SELECT ch.id as "channel_id!", coalesce(max(m.pos), 42) as "max_pos!"
FROM channels ch LEFT JOIN messages m ON ch.id = m.channel_id
GROUP BY ch.id;
