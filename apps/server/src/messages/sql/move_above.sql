WITH nearest AS (
    SELECT pos_p, pos_q
    FROM messages
    WHERE pos < $3::float8 / $4 AND channel_id = $1
    ORDER BY pos DESC
    LIMIT 1
), initial AS (
    SELECT 0 AS pos_p, 1 AS pos_q
), above AS (
    SELECT COALESCE(nearest.pos_p, initial.pos_p) AS pos_p, COALESCE(nearest.pos_q, initial.pos_q) AS pos_q
    FROM nearest RIGHT JOIN initial ON TRUE
)
UPDATE messages
SET (pos_p, pos_q) = (select p as pos_p, q as pos_q from find_intermediate(above.pos_p, above.pos_q, $3, $4))
FROM above
WHERE channel_id = $1 AND id = $2
RETURNING messages;
