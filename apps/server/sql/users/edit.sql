UPDATE
    users
SET
    nickname = COALESCE($2, nickname),
    bio = COALESCE($3, bio),
    avatar_id = COALESCE($4, avatar_id),
    default_color = COALESCE($5, default_color)
WHERE
    id = $1
RETURNING
    users AS "users!: User";

