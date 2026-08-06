SELECT
    history.entry_effect_id,
    effect.operator_id,
    effect.scope_id,
    history.entry_id,
    history.key,
    history.component_type,
    history.action AS "action!: EntryComponentHistoryAction",
    history.payload,
    effect.created
FROM entry_component_history history
JOIN entry_effects effect ON effect.id = history.entry_effect_id
WHERE effect.scope_id = $1
  AND history.entry_id = $2
ORDER BY effect.created DESC, history.entry_effect_id DESC, history.component_type;
