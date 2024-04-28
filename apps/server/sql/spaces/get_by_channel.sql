SELECT s as "space!: Space"
FROM channels ch INNER JOIN spaces s ON ch.space_id = s.id
WHERE ch.id = $1;
