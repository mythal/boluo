SELECT sm
FROM space_members sm INNER JOIN channels c ON c.space_id = sm.space_id
WHERE sm.user_id = $1 AND c.id = $2;