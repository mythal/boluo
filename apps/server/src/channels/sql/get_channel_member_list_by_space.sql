SELECT m
FROM channel_members m
    INNER JOIN channels c on c.id = m.channel_id
WHERE c.space_id = $1 AND m.is_joined;
