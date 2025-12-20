INSERT INTO character_variable_history (
    operator_id,
    character_id,
    reason,
    key,
    value
)
VALUES ($1, $2, $3, $4, $5);
