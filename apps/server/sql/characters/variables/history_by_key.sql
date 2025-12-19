SELECT character_variable_history as "history!: CharacterVariableHistory"
FROM character_variable_history
WHERE character_id = $1
  AND key = $2
ORDER BY created DESC;
