SELECT
    invite_token
FROM
    spaces
WHERE
    id = $1
    AND deleted = FALSE
LIMIT 1;

