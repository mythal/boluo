SELECT s
FROM channels ch INNER JOIN spaces s ON ch.space_id = s.id
WHERE ch.id = $1;