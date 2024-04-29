UPDATE
    messages
SET
    (pos_p,
        pos_q) = (
        SELECT
            p AS pos_p,
            q AS pos_q
        FROM
            find_intermediate ($2, $3, $4, $5))
WHERE
    id = $1
RETURNING
    messages AS "message!: Message";

