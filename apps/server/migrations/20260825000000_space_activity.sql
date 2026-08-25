CREATE TABLE space_activity (
    space_id uuid PRIMARY KEY
        CONSTRAINT space_activity_space
        REFERENCES spaces (id)
        ON DELETE CASCADE,
    latest_activity timestamptz NOT NULL
) WITH (fillfactor = 80);

INSERT INTO space_activity (space_id, latest_activity)
SELECT id, latest_activity
FROM spaces;

ALTER TABLE spaces
    DROP COLUMN latest_activity;
