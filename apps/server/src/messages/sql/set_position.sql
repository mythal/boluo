UPDATE messages
SET pos_p = $2, pos_q = $3
WHERE id = $1
RETURNING messages;
