WITH nearest AS (
    SELECT
        pos_p,
        pos_q
    FROM
        messages
    WHERE
        pos > $3::int4::float8 / $4::int4::float8
        AND channel_id = $1
    ORDER BY
        pos ASC
    LIMIT 1
),
initial AS (
    SELECT
        1 AS pos_p,
        0 AS pos_q
),
bottom AS (
    SELECT
        COALESCE(nearest.pos_p, initial.pos_p) AS pos_p,
        COALESCE(nearest.pos_q, initial.pos_q) AS pos_q
FROM
    nearest
    RIGHT JOIN initial ON TRUE)
UPDATE
    messages
SET
    (pos_p,
        pos_q) = (
        SELECT
            p AS pos_p,
            q AS pos_q
        FROM
            find_intermediate ($3::int4, $4::int4, bottom.pos_p, bottom.pos_q))
FROM
    bottom
WHERE
    channel_id = $1
    AND id = $2
RETURNING
    messages AS "message!: Message";

