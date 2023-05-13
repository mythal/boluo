CREATE EXTENSION IF NOT EXISTS "pg_rational";
DROP FUNCTION IF EXISTS "find_intermediate";

ALTER TABLE messages RENAME COLUMN pos TO pos_old;
ALTER TABLE messages ADD COLUMN pos float;

WITH ordered_messages AS (
    SELECT
        id,
        created,
        ROW_NUMBER() OVER (PARTITION BY channel_id ORDER BY pos_old) AS
    ORDER
FROM
    messages)
UPDATE
    messages m
SET
    pos = om.order::float + 1.0
FROM
    ordered_messages om
WHERE
    m.id = om.id;
ALTER TABLE messages DROP COLUMN IF EXISTS pos_old;
ALTER TABLE messages DROP COLUMN IF EXISTS pos_p;
ALTER TABLE messages DROP COLUMN IF EXISTS pos_q;
ALTER TABLE messages
    ADD CONSTRAINT pos_unique UNIQUE (channel_id, pos) DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "message_pos" ON messages (pos);
