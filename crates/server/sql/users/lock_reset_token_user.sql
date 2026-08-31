SELECT users.id
FROM users
INNER JOIN reset_tokens ON reset_tokens.user_id = users.id
WHERE reset_tokens.token = $1
    AND users.deactivated = FALSE
FOR UPDATE OF users;
