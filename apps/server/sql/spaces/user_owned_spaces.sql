SELECT
    spaces AS "space!: Space"
FROM
    spaces
WHERE
    spaces.owner_id = $1
    AND spaces.deleted = FALSE;

