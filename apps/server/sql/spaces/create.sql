WITH identifiers AS MATERIALIZED (
    SELECT uuidv7() AS space_id, uuidv7() AS scope_id
),
inserted_space AS MATERIALIZED (
    INSERT INTO spaces (
        id,
        scope_id,
        "name",
        owner_id,
        "password",
        default_dice_type,
        "description"
    )
    SELECT
        space_id,
        scope_id,
        $1,
        $2,
        COALESCE($3, ''),
        COALESCE($4, 'd20'),
        $5
    FROM identifiers
    RETURNING *
),
inserted_scope AS (
    INSERT INTO scopes (
        id,
        space_id,
        kind,
        owner_id,
        access_policy
    )
    SELECT
        scope_id,
        id,
        'Space',
        owner_id,
        'Public'
    FROM inserted_space
    RETURNING id
),
inserted_activity AS (
    INSERT INTO space_activity (space_id, latest_activity)
    SELECT id, created
    FROM inserted_space
    RETURNING latest_activity
)
SELECT
    inserted_space AS "space!: SpaceRecord",
    inserted_activity.latest_activity AS "latest_activity!"
FROM inserted_space
CROSS JOIN inserted_scope
CROSS JOIN inserted_activity;
