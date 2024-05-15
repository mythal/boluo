UPDATE
    spaces
SET
    latest_activity = now() at time zone 'utc'
WHERE
    id = $1;

