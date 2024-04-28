SELECT
    spaces AS "space!: Space"
FROM
    spaces
WHERE
    deleted = FALSE
    AND concat(name, ' ', description)
    LIKE ALL ($1)
LIMIT 1024;

