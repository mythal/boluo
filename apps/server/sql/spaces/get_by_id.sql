SELECT
    s AS "space!: Space"
FROM
    spaces s
WHERE
    s.id = $1
    AND deleted = FALSE
LIMIT 1;

