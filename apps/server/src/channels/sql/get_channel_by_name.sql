SELECT ch
FROM spaces s INNER JOIN channels ch ON ch.space_id = s.id
WHERE s.id = $1
  AND ch.name = $2
  AND ch.deleted = false
LIMIT 1;
