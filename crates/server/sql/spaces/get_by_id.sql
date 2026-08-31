SELECT
    s AS "space!: SpaceRecord",
    COALESCE(activity.latest_activity, s.created) AS "latest_activity!"
FROM
    spaces s
LEFT JOIN space_activity activity ON activity.space_id = s.id
WHERE
    s.id = $1
    AND deleted = FALSE
LIMIT 1;
