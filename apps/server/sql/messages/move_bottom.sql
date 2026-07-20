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
        RIGHT JOIN initial ON TRUE
)
UPDATE
    messages msg
SET
    (pos_p, pos_q) = (
        SELECT
            p AS pos_p,
            q AS pos_q
        FROM
            find_intermediate ($3::int4, $4::int4, bottom.pos_p, bottom.pos_q)),
    rev = rev + 1
FROM
    bottom,
    channels ch
    INNER JOIN channel_members cm ON cm.channel_id = ch.id
        AND cm.user_id = $5
        AND cm.is_joined
    INNER JOIN space_members sm ON sm.space_id = ch.space_id
        AND sm.user_id = $5
WHERE
    msg.id = $2
    AND msg.channel_id = $1
    AND msg.deleted = FALSE
    AND ch.id = msg.channel_id
    AND ch.deleted = FALSE
    AND (ch.is_document OR cm.is_master OR msg.sender_id = $5)
    AND ($6::int4 IS NULL OR (msg.pos_p = $6 AND msg.pos_q = $7))
RETURNING WITH (OLD AS before)
    msg AS "message!: Message",
    ch.space_id AS "space_id!",
    before.pos AS "old_pos!";
