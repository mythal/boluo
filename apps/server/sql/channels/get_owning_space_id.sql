SELECT
    space_id
FROM
    channels
WHERE
    id = $1
LIMIT 1;
