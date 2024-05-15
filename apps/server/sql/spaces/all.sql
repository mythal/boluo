SELECT
    spaces AS "space!: Space"
FROM
    spaces
WHERE
    deleted = FALSE
    AND explorable = TRUE
ORDER BY
    latest_activity DESC
LIMIT 512;

