SELECT
    effect.id,
    effect.space_id,
    effect.scope_id,
    effect.operator_id,
    effect.created,
    effect.message_id
FROM entry_effects effect
JOIN messages message ON message.id = effect.message_id
JOIN channels channel ON channel.id = message.channel_id
WHERE effect.space_id = $1
  AND effect.message_id = ANY($2)
  AND channel.space_id = effect.space_id
ORDER BY effect.message_id, effect.created, effect.id;
