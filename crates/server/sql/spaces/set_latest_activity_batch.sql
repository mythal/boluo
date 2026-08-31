INSERT INTO space_activity (space_id, latest_activity)
SELECT activity.space_id, activity.update_time
FROM (
    SELECT
        space_id,
        MAX(update_time) AS update_time
    FROM
        unnest($1::uuid[], $2::timestamptz[]) AS updates (space_id, update_time)
    GROUP BY
        space_id
) AS activity
INNER JOIN spaces space ON space.id = activity.space_id
ON CONFLICT (space_id) DO UPDATE
SET latest_activity = EXCLUDED.latest_activity
WHERE space_activity.latest_activity < EXCLUDED.latest_activity;
