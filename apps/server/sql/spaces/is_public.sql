SELECT
    is_public
FROM
    spaces
WHERE
    id = $1
    AND deleted = FALSE
LIMIT 1;

