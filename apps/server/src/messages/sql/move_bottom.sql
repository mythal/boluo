WITH nearest AS (
    SELECT pos
    FROM messages
    WHERE pos > $3 AND channel_id = $1
    ORDER BY pos
    LIMIT 1
), initial AS (
    SELECT ceil($3 + 2.0) AS pos
), bottom AS (
    SELECT COALESCE(nearest.pos, initial.pos) AS pos
    FROM nearest RIGHT JOIN initial ON TRUE
)
UPDATE messages
SET pos = rational_intermediate($3::rational, bottom.pos::rational)
FROM bottom
WHERE channel_id = $1 AND id = $2
RETURNING messages;
