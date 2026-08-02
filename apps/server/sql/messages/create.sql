INSERT INTO messages (id, sender_id, channel_id, name, character_id, text, entities, in_game, is_action, is_master, whisper_to_users, media_id, pos_p, pos_q, color)
    SELECT $1, $2, channel.id, $4, target_character.id, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    FROM channels channel
    LEFT JOIN characters target_character
        ON target_character.id = $5
        AND target_character.space_id = channel.space_id
        AND target_character.archived_at IS NULL
    WHERE channel.id = $3
      AND ($5::uuid IS NULL OR target_character.id IS NOT NULL)
RETURNING
    messages AS "message!: Message";
