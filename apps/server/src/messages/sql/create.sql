INSERT INTO messages (
    id,
    sender_id,
    channel_id,
    name,
    text,
    entities,
    in_game,
    is_action,
    is_master,
    whisper_to_users,
    media_id,
    pos
)
VALUES (
    COALESCE($1, uuid_generate_v1mc()),
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    $11,
    $12
)
RETURNING messages;
