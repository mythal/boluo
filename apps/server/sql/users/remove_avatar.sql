UPDATE
    users
SET
    avatar_id = NULL
WHERE
    id = $1
RETURNING
    users AS "users!: User";

