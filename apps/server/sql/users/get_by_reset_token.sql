SELECT users AS  "users!: User"
FROM users INNER JOIN reset_tokens ON users.id = reset_tokens.user_id
WHERE reset_tokens.token = $1
LIMIT 1;
