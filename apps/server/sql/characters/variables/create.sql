INSERT INTO character_variables (
    key,
    character_id,
    display_name,
    alias,
    sort,
    track_history,
    value,
    metadata
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING character_variables as "variable!: CharacterVariable";
