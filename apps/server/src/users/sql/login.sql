SELECT (password = crypt($2, password)), users
FROM users
WHERE (username = $1 OR email = lower($1))
  AND deactivated = false
LIMIT 1;
