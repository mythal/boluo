SELECT users AS  "users!: User"
FROM users INNER JOIN reset_tokens ON users.id = reset_tokens.user_id
WHERE reset_tokens.token = $1
    AND reset_tokens.used_at IS NULL
    AND reset_tokens.invalidated_at IS NULL
    AND reset_tokens.created > now() - ($2::bigint * interval '1 second')
    AND users.deactivated = FALSE
LIMIT 1;
