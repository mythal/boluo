UPDATE entries
SET components_version = uuidv7()
WHERE id = $1
RETURNING components_version;
