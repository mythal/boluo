UPDATE
    messages
SET
    folded = $2,
    rev = rev + 1
WHERE
    id = $1
    AND deleted = FALSE
RETURNING
    messages AS "message!: Message";
