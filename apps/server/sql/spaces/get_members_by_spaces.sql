SELECT m as "space!: SpaceMember", u as "user!: User"
FROM space_members m
    INNER JOIN users u on u.id = m.user_id
WHERE space_id = $1 AND u.deactivated = false;
