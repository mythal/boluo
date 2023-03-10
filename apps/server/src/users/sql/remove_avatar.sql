UPDATE users
SET avatar_id = null
WHERE id = $1
RETURNING users;
