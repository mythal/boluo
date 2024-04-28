UPDATE
    spaces
SET
    deleted = TRUE
WHERE
    id = $1;

