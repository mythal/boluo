CREATE EXTENSION IF NOT EXISTS "citext";
CREATE TYPE character_visibility AS ENUM ('Private', 'Public');

CREATE TABLE characters (
    "id" uuid NOT NULL DEFAULT uuid_generate_v1mc () PRIMARY KEY,
    "name" text NOT NULL,
    "description" text NOT NULL DEFAULT '',
    "color" text NOT NULL DEFAULT '',
    "alias" text,
    "image_id" uuid DEFAULT NULL CONSTRAINT "character_image" REFERENCES media (id) ON DELETE SET NULL,
    "space_id" uuid NOT NULL CONSTRAINT "character_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "owner_id" uuid NOT NULL CONSTRAINT "character_owner" REFERENCES users (id) ON DELETE CASCADE,
    "visibility" character_visibility NOT NULL DEFAULT 'Private',
    -- Hidden from character lists, but still usable.
    "is_archived" boolean NOT NULL DEFAULT FALSE,
    "metadata" jsonb NOT NULL DEFAULT '{}',
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "modified" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT "character_space_alias_unique" UNIQUE ("space_id", "alias"),
    CONSTRAINT "character_space_name_unique" UNIQUE ("space_id", "name")
);

CREATE INDEX "character_space_id_index" ON "characters" ("space_id");

CREATE TABLE character_variables (
    "key" citext NOT NULL CHECK (length(trim(key)) > 0),
    "character_id" uuid NOT NULL CONSTRAINT "character_variable_character" REFERENCES characters (id) ON DELETE CASCADE,
    "display_name" text NOT NULL DEFAULT '',
    "alias" text[] NOT NULL DEFAULT '{}',
    "sort" integer NOT NULL DEFAULT 0,
    "track_history" boolean NOT NULL DEFAULT TRUE,
    "value" jsonb NOT NULL,
    "metadata" jsonb NOT NULL DEFAULT '{}',
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "modified" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT "character_variable_primary" PRIMARY KEY ("character_id", "key")
);

CREATE INDEX "character_variable_character_sort_index" ON "character_variables" ("character_id", "sort");

CREATE TABLE character_variable_history (
    "id" uuid NOT NULL DEFAULT uuid_generate_v1mc () PRIMARY KEY,
    "operator_id" uuid CONSTRAINT "character_variable_history_operator" REFERENCES users (id) ON DELETE SET NULL,
    "character_id" uuid NOT NULL CONSTRAINT "character_variable_history_character" REFERENCES characters (id) ON DELETE CASCADE,
    "reason" jsonb DEFAULT NULL,
    "key" citext NOT NULL,
    "value" jsonb NOT NULL,
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc')
);

CREATE INDEX "character_variable_history_character_created_index" ON "character_variable_history" ("character_id", "created" DESC);

CREATE TYPE note_type AS ENUM ('Term', 'Character');
CREATE TYPE note_visibility AS ENUM ('Private', 'Channels', 'Users', 'Public');

CREATE TABLE notes (
    "id" uuid NOT NULL DEFAULT uuid_generate_v1mc () PRIMARY KEY,
    "type" note_type NOT NULL DEFAULT 'Term',
    "space_id" uuid NOT NULL CONSTRAINT "notes_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "title" text NOT NULL DEFAULT '',
    "keywords" text[] NOT NULL DEFAULT '{}',
    "disabled" boolean NOT NULL DEFAULT FALSE,
    "owner_id" uuid NOT NULL CONSTRAINT "notes_owner" REFERENCES users (id) ON DELETE CASCADE,
    "content" text NOT NULL DEFAULT '',
    "visibility" note_visibility NOT NULL DEFAULT 'Private',
    "visible_to" uuid[] NOT NULL DEFAULT '{}',
    "everyone_can_edit" boolean NOT NULL DEFAULT FALSE,
    "track_history" boolean NOT NULL DEFAULT FALSE,
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "modified" timestamptz NOT NULL DEFAULT (now() at time zone 'utc')
);

CREATE INDEX "notes_space_index" ON "notes" ("space_id");
CREATE INDEX "notes_space_owner_index" ON "notes" ("space_id", "owner_id");

CREATE TABLE notes_history (
    "id" uuid NOT NULL DEFAULT uuid_generate_v1mc () PRIMARY KEY,
    "note_id" uuid NOT NULL CONSTRAINT "notes_history_note" REFERENCES notes (id) ON DELETE CASCADE,
    "operator_id" uuid CONSTRAINT "notes_history_operator" REFERENCES users (id) ON DELETE SET NULL,
    "content" text NOT NULL DEFAULT '',
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc')
);

CREATE INDEX "notes_history_note_created_index" ON "notes_history" ("note_id", "created" DESC);
