UPDATE
    messages
SET
    deleted = TRUE
WHERE
    id = $1;

