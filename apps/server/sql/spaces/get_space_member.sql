SELECT
    member AS "space_member!: SpaceMember"
FROM
    space_members member
WHERE
    user_id = $1
    AND space_id = $2
LIMIT 1;

