SELECT id, user_id, created FROM user_sessions
WHERE id = $1 AND active = TRUE;
