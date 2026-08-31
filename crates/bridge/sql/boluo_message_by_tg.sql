SELECT boluo_message_id, boluo_media_id
FROM message_map
WHERE binding_id = ?1 AND tg_message_id = ?2;
