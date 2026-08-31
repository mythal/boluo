UPDATE user_sessions
SET active = FALSE
WHERE id = $1;
