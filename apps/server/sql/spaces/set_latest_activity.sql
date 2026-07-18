UPDATE
    spaces
SET
    latest_activity = GREATEST(latest_activity, $2)
WHERE
    id = $1;
