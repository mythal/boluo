INSERT INTO binding (
    boluo_base_url,
    boluo_space_id,
    tg_chat_id,
    created_at,
    updated_at
)
VALUES (?1, ?2, ?3, ?4, ?4)
RETURNING id;
