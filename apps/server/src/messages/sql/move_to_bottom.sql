WITH target AS (
    SELECT msg.channel_id AS channel_id, msg.pos AS pos
    FROM messages msg
    WHERE id = $2
), bottom AS (
    SELECT msg.pos AS pos
    FROM messages msg, target
    WHERE msg.pos > target.pos AND msg.channel_id = target.channel_id
    ORDER BY msg.pos ASC
    LIMIT 1
), move AS (
    SELECT rational_intermediate(target.pos::rational, bottom.pos::rational)::float AS pos
    FROM target LEFT JOIN bottom USING (pos)
)
UPDATE messages
SET pos = move.pos
FROM move, target
WHERE id = $1 AND messages.channel_id = target.channel_id
RETURNING messages;
