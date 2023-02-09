UPDATE messages
SET pos = $2
WHERE id = $2
RETURNING messages;
