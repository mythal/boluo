SELECT message_thread_id
FROM channel_topic
WHERE binding_id = ?1 AND channel_id = ?2;
