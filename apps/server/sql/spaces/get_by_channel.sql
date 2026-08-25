SELECT
    s AS "space!: SpaceRecord",
    COALESCE(activity.latest_activity, s.created) AS "latest_activity!"
FROM
    channels ch
    INNER JOIN spaces s ON ch.space_id = s.id
    LEFT JOIN space_activity activity ON activity.space_id = s.id
WHERE
    ch.id = $1;
