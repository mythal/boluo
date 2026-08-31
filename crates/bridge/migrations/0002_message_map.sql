CREATE TABLE message_map (
    binding_id INTEGER NOT NULL REFERENCES binding(id) ON DELETE CASCADE,
    boluo_message_id TEXT NOT NULL,
    tg_message_id INTEGER NOT NULL,
    tg_is_media INTEGER NOT NULL CHECK (tg_is_media IN (0, 1)),
    boluo_media_id TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (binding_id, boluo_message_id),
    UNIQUE (binding_id, tg_message_id)
) STRICT, WITHOUT ROWID;
