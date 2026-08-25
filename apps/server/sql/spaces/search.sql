SELECT
    space AS "space!: SpaceRecord",
    COALESCE(activity.latest_activity, space.created) AS "latest_activity!"
FROM
    spaces space
LEFT JOIN space_activity activity ON activity.space_id = space.id
WHERE
    space.deleted = FALSE
    AND concat(space.name, ' ', space.description)
    LIKE ALL ($1)
LIMIT 1024;
