SELECT character_variables as "variable!: CharacterVariable"
FROM character_variables
WHERE character_id = $1
  AND key = $2;
