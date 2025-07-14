SELECT
    users_extension AS "user_ext!: UserExt"
FROM
    users_extension
WHERE
    user_id = $1;

