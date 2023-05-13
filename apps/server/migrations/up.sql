-- From https://wiki.postgresql.org/wiki/User-specified_ordering_with_fractions
CREATE OR REPLACE FUNCTION find_intermediate (p1 integer, q1 integer, p2 integer, q2 integer, OUT p integer, OUT q integer)
LANGUAGE plpgsql
IMMUTABLE STRICT
AS $f$
DECLARE
    pl integer := 0;
    ql integer := 1;
    ph integer := 1;
    qh integer := 0;
BEGIN
    IF (p1::bigint * q2 + 1) <> (p2::bigint * q1) THEN
        LOOP
            p := pl + ph;
            q := ql + qh;
            IF (p::bigint * q1 <= q::bigint * p1) THEN
                pl := p;
                ql := q;
            ELSIF (p2::bigint * q <= q2::bigint * p) THEN
                ph := p;
                qh := q;
            ELSE
                exit;
            END IF;
        END LOOP;
    ELSE
        p := p1 + p2;
        q := q1 + q2;
    END IF;
END;
$f$;

ALTER TABLE messages
    ADD COLUMN pos_p integer;

ALTER TABLE messages
    ADD COLUMN pos_q integer;

UPDATE messages SET pos_q = 1;

WITH ordered_messages AS (
    SELECT
        id,
        created,
        ROW_NUMBER() OVER (PARTITION BY channel_id ORDER BY pos) AS
    ORDER
FROM
    messages)
UPDATE
    messages m
SET
    pos_p = om.order
FROM
    ordered_messages om
WHERE
    m.id = om.id;

ALTER TABLE messages
    ALTER COLUMN pos_p SET NOT NULL;

ALTER TABLE messages
    ALTER COLUMN pos_q SET NOT NULL;


ALTER TABLE messages DROP CONSTRAINT IF EXISTS pos_unique;

DROP INDEX IF EXISTS "message_pos";

ALTER TABLE messages DROP COLUMN pos;

ALTER TABLE messages ADD COLUMN pos float8 generated always AS (pos_p::float8 / pos_q) stored;

ALTER TABLE messages
    ADD CONSTRAINT pos_unique UNIQUE (channel_id, pos) DEFERRABLE INITIALLY IMMEDIATE;
DROP EXTENSION IF EXISTS "pg_rational";
