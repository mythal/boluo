SELECT invite_token
FROM spaces
WHERE id = $1 AND deleted = false
LIMIT 1;
