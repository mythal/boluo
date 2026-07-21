INSERT INTO message_map (
    binding_id,
    boluo_message_id,
    tg_message_id,
    tg_is_media,
    boluo_media_id,
    created_at
)
VALUES (?1, ?2, ?3, ?4, ?5, ?6)
ON CONFLICT (binding_id, boluo_message_id) DO UPDATE SET
    tg_message_id = excluded.tg_message_id,
    tg_is_media = excluded.tg_is_media,
    boluo_media_id = excluded.boluo_media_id,
    created_at = excluded.created_at;
