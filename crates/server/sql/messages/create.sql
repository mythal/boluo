INSERT INTO messages (id, sender_id, channel_id, name, character_id, portrait_id, text, entities, in_game, is_action, is_master, whisper_to_users, media_id, pos_p, pos_q, color)
    SELECT $1, $2, channel.id, $4, target_character.id, target_portrait.id, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    FROM channels channel
    LEFT JOIN characters target_character
        ON target_character.id = $5
        AND target_character.space_id = channel.space_id
        AND target_character.archived_at IS NULL
    LEFT JOIN assets target_portrait
        ON target_portrait.id = $6
        AND target_portrait.space_id = channel.space_id
        AND EXISTS (
            SELECT 1
            FROM media portrait_media
            WHERE portrait_media.id = target_portrait.media_id
              AND portrait_media.mime_type LIKE 'image/%'
        )
    WHERE channel.id = $3
      AND ($5::uuid IS NULL OR target_character.id IS NOT NULL)
      AND ($6::uuid IS NULL OR target_portrait.id IS NOT NULL)
RETURNING
    messages AS "message!: Message";
