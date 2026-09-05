CREATE TABLE deleted_messages (
    id uuid PRIMARY KEY,
    channel_id uuid NOT NULL,
    deleted_at timestamptz NOT NULL DEFAULT now(),
    deleted_by uuid,
    message jsonb NOT NULL
);

CREATE INDEX deleted_messages_channel_index ON deleted_messages (channel_id, deleted_at DESC);

INSERT INTO deleted_messages (id, channel_id, message)
SELECT
    id,
    channel_id,
    to_jsonb(messages) - 'deleted'
FROM
    messages
WHERE
    deleted;

DELETE FROM messages
WHERE deleted;

ALTER TABLE messages
    DROP COLUMN deleted;

ALTER TABLE entry_effects
    DROP CONSTRAINT IF EXISTS entry_effect_message;
