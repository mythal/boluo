SELECT
    m AS "space!: SpaceMember",
    u AS "user!: User"
FROM
    space_members m
    INNER JOIN users u ON u.id = m.user_id
WHERE
    space_id = $1
    AND u.deactivated = FALSE;

