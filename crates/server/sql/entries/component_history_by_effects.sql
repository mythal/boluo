SELECT
    history.entry_effect_id,
    effect.operator_id,
    effect.scope_id,
    history.entry_id,
    history.key,
    history.component_type,
    history.action AS "action!: EntryComponentHistoryAction",
    history.payload,
    previous.payload AS "before_payload?",
    effect.created
FROM entry_component_history history
JOIN entry_effects effect ON effect.id = history.entry_effect_id
LEFT JOIN LATERAL (
    SELECT prior.payload
    FROM entry_component_history prior
    JOIN entry_effects prior_effect ON prior_effect.id = prior.entry_effect_id
    WHERE prior.entry_id = history.entry_id
      AND prior.component_type = history.component_type
      AND prior_effect.scope_id = effect.scope_id
      AND (prior_effect.created, prior.entry_effect_id) < (effect.created, history.entry_effect_id)
    ORDER BY prior_effect.created DESC, prior.entry_effect_id DESC
    LIMIT 1
) previous ON TRUE
WHERE history.entry_effect_id = ANY($1)
ORDER BY
    effect.created DESC,
    history.entry_effect_id DESC,
    history.entry_id,
    history.component_type;
