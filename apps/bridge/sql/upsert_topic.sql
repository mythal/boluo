INSERT INTO channel_topic (
    binding_id,
    channel_id,
    message_thread_id,
    created_at
)
VALUES (?1, ?2, ?3, ?4)
ON CONFLICT (binding_id, channel_id) DO UPDATE SET
    message_thread_id = excluded.message_thread_id,
    created_at = excluded.created_at;
