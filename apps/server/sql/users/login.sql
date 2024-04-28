SELECT
  (PASSWORD = crypt($2, PASSWORD)) AS "password_match!",
  users AS "user!: User"
FROM
  users
WHERE (username = $1
  OR email = lower($1))
AND deactivated = FALSE
LIMIT 1;

