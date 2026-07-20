UPDATE spaces
SET
    latest_activity = GREATEST(spaces.latest_activity, activity.update_time)
FROM (
    SELECT
        space_id,
        MAX(update_time) AS update_time
    FROM
        unnest($1::uuid[], $2::timestamptz[]) AS updates (space_id, update_time)
    GROUP BY
        space_id
) AS activity
WHERE
    spaces.id = activity.space_id;
