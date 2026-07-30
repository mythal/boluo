UPDATE
    space_members
SET
    is_admin = COALESCE($1, is_admin),
    is_game_master = COALESCE($2, is_game_master)
WHERE
    user_id = $3
    AND space_id = $4
RETURNING
    space_members AS "space_member!: SpaceMember";
