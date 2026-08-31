SELECT id, boluo_space_id, tg_chat_id
FROM binding
WHERE boluo_base_url = ?1
    AND paused_reason IS NULL
ORDER BY id;
