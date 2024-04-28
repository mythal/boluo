SELECT (password = crypt($2, password)) as "password_match!", users as "user!: User"
FROM users
WHERE (username = $1 OR email = lower($1))
  AND deactivated = false
LIMIT 1;
