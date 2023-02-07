SELECT m, u
FROM channel_members m
    INNER JOIN users u on u.id = m.user_id
WHERE channel_id = $1 AND ($2 OR is_joined);
