SELECT ch
FROM channels ch
WHERE ch.id = $1
  AND deleted = false
LIMIT 1;
