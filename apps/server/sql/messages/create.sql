INSERT INTO messages (id, sender_id, channel_id, name, text, entities, in_game, is_action, is_master, whisper_to_users, media_id, pos_p, pos_q, color)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING
    messages AS "message!: Message";

