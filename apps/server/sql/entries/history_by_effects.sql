SELECT
    history.entry_effect_id,
    effect.operator_id,
    effect.scope_id,
    history.entry_id,
    history.key,
    history.previous_key,
    history.action AS "action!: EntryHistoryAction",
    effect.created
FROM entry_history history
JOIN entry_effects effect ON effect.id = history.entry_effect_id
WHERE history.entry_effect_id = ANY($1)
ORDER BY effect.created DESC, history.entry_effect_id DESC, history.entry_id;
