-- Lock and authorize the message before checking the destination. Materializing this
-- row preserves its pre-update position for the event and makes expect_pos atomic.
WITH target AS MATERIALIZED (
    SELECT
        msg.id,
        msg.pos AS old_pos,
        ch.space_id
    FROM
        messages msg
        INNER JOIN channels ch ON ch.id = msg.channel_id
            AND ch.deleted = FALSE
        INNER JOIN channel_members cm ON cm.channel_id = ch.id
            AND cm.user_id = $5
            AND cm.is_joined
        INNER JOIN space_members sm ON sm.space_id = ch.space_id
            AND sm.user_id = $5
    WHERE
        msg.id = $1
        AND msg.channel_id = $2
        AND msg.deleted = FALSE
        AND (ch.is_document OR cm.is_master OR msg.sender_id = $5)
        AND ($6::int4 IS NULL OR (msg.pos_p = $6 AND msg.pos_q = $7))
    FOR UPDATE OF msg
),
-- A requested fraction may already belong to another message. Return that message
-- instead of violating the channel_id/pos unique constraint.
existing_in_pos AS (
    SELECT
        messages
    FROM
        messages
        INNER JOIN target ON messages.channel_id = $2
            AND messages.pos = ($3::int4::float8 / $4::int4::float8)
),
-- Update only when the authorized target exists and the destination is unoccupied.
move_pos AS (
    UPDATE
        messages msg
    SET
        pos_p = $3,
        pos_q = $4,
        rev = rev + 1
    FROM
        target
    WHERE
        msg.id = target.id
        AND NOT EXISTS (SELECT 1 FROM existing_in_pos)
    RETURNING
        msg
)
-- Exactly one branch normally produces a row: the moved target on success, or the
-- message occupying the destination so the caller can choose a fallback position.
SELECT
    move_pos.msg AS "message!: Message",
    target.space_id AS "space_id!",
    target.old_pos AS "old_pos!"
FROM
    move_pos
    CROSS JOIN target
UNION ALL
SELECT
    existing_in_pos.messages AS "message!: Message",
    target.space_id AS "space_id!",
    target.old_pos AS "old_pos!"
FROM
    existing_in_pos
    CROSS JOIN target
LIMIT 1;
