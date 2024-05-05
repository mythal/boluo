ALTER TABLE spaces
    ADD COLUMN "latest_activity" timestamptz NOT NULL DEFAULT (now() at time zone 'utc');

UPDATE spaces
SET latest_activity = (
    SELECT COALESCE(MAX(messages.created), to_timestamp(0))
    FROM channels
    LEFT JOIN messages ON messages.channel_id = channels.id
    WHERE channels.space_id = spaces.id
    GROUP BY channels.space_id
);

CREATE INDEX "space_latest_activity" ON spaces (latest_activity DESC);
