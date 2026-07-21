SELECT channel_id, message_thread_id
FROM channel_topic
WHERE binding_id = ?1
ORDER BY channel_id;
