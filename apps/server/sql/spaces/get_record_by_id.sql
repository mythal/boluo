SELECT
    space AS "space!: SpaceRecord"
FROM spaces space
WHERE
    space.id = $1
    AND space.deleted = FALSE
LIMIT 1;
