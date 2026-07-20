UPDATE
    spaces
SET
    latest_activity = now()
WHERE
    id = $1;
