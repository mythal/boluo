SELECT
    space AS "space!: SpaceRecord",
    COALESCE(activity.latest_activity, space.created) AS "latest_activity!"
FROM
    spaces space
LEFT JOIN space_activity activity ON activity.space_id = space.id
WHERE
    space.deleted = FALSE
    AND space.explorable = TRUE
ORDER BY
    COALESCE(activity.latest_activity, space.created) DESC
LIMIT 512;
