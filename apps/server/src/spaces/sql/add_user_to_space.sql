WITH add(space_members) AS (
    INSERT INTO space_members (user_id, space_id, is_admin)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING space_members
)
SELECT true AS created, space_members FROM add
UNION ALL
SELECT false AS created, space_members FROM space_members
WHERE user_id = $1 AND space_id = $2
LIMIT 1;
