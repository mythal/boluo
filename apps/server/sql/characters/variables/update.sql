UPDATE character_variables
SET display_name = COALESCE($3, display_name),
    alias = COALESCE($4, alias),
    sort = COALESCE($5, sort),
    track_history = COALESCE($6, track_history),
    value = COALESCE($7, value),
    metadata = COALESCE($8, metadata),
    modified = (now() at time zone 'utc')
WHERE character_id = $1
  AND key = $2
RETURNING character_variables as "variable!: CharacterVariable";
