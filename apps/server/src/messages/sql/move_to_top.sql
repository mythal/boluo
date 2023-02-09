WITH target AS (
    SELECT msg.channel_id AS channel_id, msg.pos AS pos
    FROM messages msg
    WHERE id = $2
), top AS (
    SELECT msg.pos AS pos
    FROM messages msg, target
    WHERE msg.pos < target.pos AND msg.channel_id = target.channel_id
    ORDER BY msg.pos DESC
    LIMIT 1
), move AS (
    SELECT
        CASE WHEN top.pos IS NULL THEN
            target.pos - 1.0
        ELSE
            rational_intermediate(top.pos::rational, target.pos::rational)::float
        END AS pos
    FROM target LEFT JOIN top USING (pos)
)
UPDATE messages
SET pos = move.pos
FROM move, target
WHERE id = $1 AND messages.channel_id = target.channel_id
RETURNING messages;
