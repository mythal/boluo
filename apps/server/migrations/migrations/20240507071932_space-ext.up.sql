CREATE TABLE spaces_extension
(
    "space_id"  uuid  NOT NULL PRIMARY KEY
        CONSTRAINT "extension_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "settings" jsonb NOT NULL DEFAULT '{}'
);
