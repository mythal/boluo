SELECT character_variables as "variable!: CharacterVariable"
FROM character_variables
WHERE character_id = $1
ORDER BY sort, key;
