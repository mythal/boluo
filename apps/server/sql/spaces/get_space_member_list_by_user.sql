SELECT
    sm AS "member!: SpaceMember"
FROM
    space_members sm
    INNER JOIN spaces s ON sm.space_id = s.id
        AND s.deleted = FALSE
    INNER JOIN users u ON u.id = $1
WHERE
    sm.user_id = $1
ORDER BY
    s.latest_activity DESC;

