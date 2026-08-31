SELECT
    member AS "member!: SpaceMember"
FROM
    space_members member
WHERE
    member.space_id = $1;
