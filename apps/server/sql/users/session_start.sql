INSERT INTO user_sessions (id, user_id)
VALUES ($1, $2)
RETURNING id, user_id, created;
