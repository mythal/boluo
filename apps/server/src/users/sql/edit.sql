UPDATE users
SET nickname = COALESCE($2, nickname), bio = COALESCE($3, bio), avatar_id = COALESCE($4, avatar_id)
WHERE id = $1
RETURNING users;
