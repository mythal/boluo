UPDATE messages message
SET entry_effect_id = effect.id,
    rev = message.rev + 1
FROM entry_effects effect, channels channel
WHERE message.id = $1
  AND message.sender_id = $2
  AND message.deleted = FALSE
  AND message.entry_effect_id IS NULL
  AND effect.id = $3
  AND effect.operator_id = $2
  AND message.channel_id = channel.id
  AND channel.space_id = effect.space_id
RETURNING message AS "message!: Message";
