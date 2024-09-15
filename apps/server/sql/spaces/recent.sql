SELECT
    id AS "id!: Uuid"
FROM
    spaces
WHERE
    deleted = FALSE
    AND latest_activity > now() - interval '2 hours';
