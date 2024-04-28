UPDATE
    users
SET
    PASSWORD = crypt($2, gen_salt('bf'))
WHERE
    id = $1;

