SELECT m, u
FROM space_members m
    INNER JOIN users u on u.id = m.user_id
WHERE space_id = $1 AND u.deactivated = false;
