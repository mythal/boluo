UPDATE
    users
SET
    deactivated = TRUE
WHERE
    id = $1;

