SELECT
    s AS "space!: Space"
FROM
    spaces s
WHERE
    s.id = ANY($1)
    AND deleted = FALSE;
