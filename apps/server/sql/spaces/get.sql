SELECT
    s AS "space!: Space",
    u AS "user!: User"
FROM
    spaces s
    LEFT JOIN users u ON CASE WHEN $3 THEN
        s.owner_id = u.id
    END
WHERE
    CASE WHEN $1 IS NOT NULL THEN
        s.id = $1
    WHEN $2 IS NOT NULL THEN
        s.name = $2
    END
    AND deleted = FALSE
LIMIT 1;

