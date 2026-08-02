INSERT INTO entry_history (
    entry_effect_id,
    entry_id,
    key,
    previous_key,
    action
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    ($5::text)::entry_history_action
);
