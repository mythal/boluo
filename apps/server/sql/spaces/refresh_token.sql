UPDATE
    spaces
SET
    invite_token = gen_random_uuid ()
WHERE
    id = $1
    AND deleted = FALSE
RETURNING
    invite_token;

