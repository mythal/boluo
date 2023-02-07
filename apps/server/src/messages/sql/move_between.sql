UPDATE messages
SET pos = rational_intermediate($2::rational, $3::rational)
WHERE id = $1
RETURNING messages;
