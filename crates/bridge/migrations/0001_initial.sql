CREATE TABLE binding (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boluo_base_url TEXT NOT NULL,
    boluo_space_id TEXT NOT NULL,
    tg_chat_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    paused_reason TEXT,
    paused_at INTEGER,
    UNIQUE (boluo_base_url, tg_chat_id),
    UNIQUE (boluo_base_url, boluo_space_id),
    CHECK ((paused_reason IS NULL) = (paused_at IS NULL))
) STRICT;

CREATE TABLE channel_topic (
    binding_id INTEGER NOT NULL REFERENCES binding(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    message_thread_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (binding_id, channel_id),
    UNIQUE (binding_id, message_thread_id)
) STRICT, WITHOUT ROWID;

CREATE TABLE boluo_cursor (
    binding_id INTEGER PRIMARY KEY REFERENCES binding(id) ON DELETE CASCADE,
    timestamp INTEGER NOT NULL,
    node INTEGER NOT NULL CHECK (node BETWEEN 0 AND 65535),
    seq INTEGER NOT NULL CHECK (seq BETWEEN 0 AND 4294967295),
    updated_at INTEGER NOT NULL
) STRICT;
