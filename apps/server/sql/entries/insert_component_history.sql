INSERT INTO entry_component_history (
    entry_effect_id,
    entry_id,
    key,
    component_type,
    action,
    data,
    schema_version
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    ($5::text)::entry_component_history_action,
    $6,
    $7
);
