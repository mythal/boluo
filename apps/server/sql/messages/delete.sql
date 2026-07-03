UPDATE
    messages
SET
    deleted = TRUE
WHERE
    id = $1
    AND deleted = FALSE;
