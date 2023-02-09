WITH nearest AS (
    SELECT pos
    FROM messages
    WHERE pos < $3 AND channel_id = $1
    ORDER BY pos DESC
    LIMIT 1
), initial AS (
    SELECT 0.0 AS pos
), above AS (
    SELECT COALESCE(nearest.pos, initial.pos) AS pos
    FROM nearest RIGHT JOIN initial ON TRUE
)
UPDATE messages
SET pos = rational_intermediate(above.pos::rational, $3::rational)
FROM above
WHERE channel_id = $1 AND id = $2
RETURNING messages;
