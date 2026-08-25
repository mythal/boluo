SELECT
    space.id AS "id!: Uuid"
FROM
    spaces space
    INNER JOIN space_activity activity ON activity.space_id = space.id
WHERE
    space.deleted = FALSE
    AND activity.latest_activity > now() - interval '2 hours';
