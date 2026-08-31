SELECT
    b.id,
    b.boluo_space_id,
    b.tg_chat_id,
    ct.channel_id
FROM binding b
JOIN channel_topic ct ON ct.binding_id = b.id
WHERE b.boluo_base_url = ?1
    AND b.tg_chat_id = ?2
    AND ct.message_thread_id = ?3;
