WITH target_message AS MATERIALIZED (
    SELECT message.id
    FROM messages message
    JOIN channels channel ON channel.id = message.channel_id
    JOIN entry_effects effect
      ON effect.id = $3
     AND effect.operator_id = $2
     AND effect.space_id = channel.space_id
     AND effect.message_id IS NULL
    WHERE message.id = $1
      AND message.sender_id = $2
      AND message.deleted = FALSE
    FOR UPDATE OF message, effect
), attached_effect AS (
    UPDATE entry_effects effect
    SET message_id = target.id
    FROM target_message target
    WHERE effect.id = $3
    RETURNING effect.message_id
)
UPDATE messages message
SET has_entry_effects = TRUE,
    rev = message.rev + 1
FROM attached_effect effect
WHERE message.id = effect.message_id
RETURNING message AS "message!: Message";
