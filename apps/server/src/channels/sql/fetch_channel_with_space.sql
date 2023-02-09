SELECT ch, s
FROM channels ch INNER JOIN spaces s ON ch.space_id = s.id
WHERE ch.id = $1
  AND ch.deleted = false
LIMIT 1;
