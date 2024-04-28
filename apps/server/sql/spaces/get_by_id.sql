SELECT s as "space!: Space"
FROM spaces s
WHERE s.id = $1
  AND deleted = false
LIMIT 1;
