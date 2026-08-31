SELECT tg_message_id, tg_is_media
FROM message_map
WHERE binding_id = ?1 AND boluo_message_id = ?2;
