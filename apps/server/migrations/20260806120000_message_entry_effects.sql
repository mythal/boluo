ALTER TABLE entry_effects
    ADD COLUMN message_id uuid
        CONSTRAINT entry_effect_message
        REFERENCES messages (id)
        ON DELETE SET NULL;

UPDATE entry_effects effect
SET message_id = message.id
FROM messages message
WHERE message.entry_effect_id = effect.id;

CREATE INDEX entry_effect_message_index
    ON entry_effects (message_id, created, id)
    WHERE message_id IS NOT NULL;

ALTER TABLE messages
    ADD COLUMN has_entry_effects boolean NOT NULL DEFAULT FALSE;

UPDATE messages
SET has_entry_effects = TRUE
WHERE entry_effect_id IS NOT NULL;

DROP INDEX message_entry_effect_unique;

ALTER TABLE messages
    DROP CONSTRAINT message_entry_effect,
    DROP COLUMN entry_effect_id;
