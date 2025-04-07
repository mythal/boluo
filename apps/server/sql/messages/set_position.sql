WITH
    existing_in_pos AS (
        SELECT
            messages
        FROM
            messages
        WHERE
            channel_id = $2
            AND pos = ($3::int::float8 / $4::int::float8)
    ),
    move_pos AS (
        UPDATE
            messages
        SET
            pos_p = $3,
            pos_q = $4
        WHERE
            id = $1
            -- Only update if a message is not already in the target position
            AND NOT EXISTS (SELECT 1 FROM existing_in_pos)
        RETURNING
            messages
    )
SELECT
    messages AS "message!: Message"
FROM
    move_pos
UNION ALL
SELECT
    messages AS "message!: Message"
FROM
    existing_in_pos
LIMIT 1;
