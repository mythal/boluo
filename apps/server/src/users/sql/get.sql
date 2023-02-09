SELECT users
FROM users
WHERE CASE
          WHEN $1 IS NOT NULL THEN id = $1
          WHEN $2 IS NOT NULL THEN email = $2
          WHEN $3 IS NOT NULL THEN username = $3 END
  AND deactivated = false
LIMIT 1;
