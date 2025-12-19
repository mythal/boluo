SELECT characters as "character!: Character"
FROM characters
WHERE space_id = $1
ORDER BY modified DESC;
