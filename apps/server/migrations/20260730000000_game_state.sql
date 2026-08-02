-- No previous production data exist, so we can safely drop the old tables and types.
DROP TABLE character_variable_history;
DROP TABLE character_variables;
DROP TABLE characters;
DROP TYPE character_visibility;

CREATE TYPE identifier_kind AS ENUM ('Primary', 'Alias');

CREATE TABLE characters (
    "id" uuid NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    "name" text NOT NULL,
    "description" text NOT NULL DEFAULT '',
    "color" text NOT NULL DEFAULT '',
    "space_id" uuid NOT NULL CONSTRAINT "character_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "main_scope_id" uuid NOT NULL,
    "archived_at" timestamptz,
    "tags" text[] NOT NULL DEFAULT '{}',
    "created" timestamptz NOT NULL DEFAULT now(),
    "modified" timestamptz NOT NULL DEFAULT now(),
    "version" uuid NOT NULL DEFAULT uuidv7(),
    CONSTRAINT "character_space_id_unique" UNIQUE ("space_id", "id"),
    CONSTRAINT "character_main_scope_unique" UNIQUE ("main_scope_id")
);

CREATE TABLE character_identifiers (
    "space_id" uuid NOT NULL,
    "character_id" uuid NOT NULL,
    "value" citext NOT NULL,
    "kind" identifier_kind NOT NULL,
    CONSTRAINT "character_identifier_pkey" PRIMARY KEY ("space_id", "value"),
    CONSTRAINT "character_identifier_character"
        FOREIGN KEY ("space_id", "character_id")
        REFERENCES characters ("space_id", "id")
        ON DELETE CASCADE
);

CREATE INDEX "character_space_modified_index"
    ON "characters" ("space_id", "modified" DESC);

CREATE INDEX "character_identifier_character_index"
    ON "character_identifiers" ("character_id", "value");

CREATE UNIQUE INDEX "character_identifier_one_primary"
    ON "character_identifiers" ("character_id")
    WHERE "kind" = 'Primary';

ALTER TABLE spaces
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ADD COLUMN scope_id uuid;

DROP TABLE notes_history;
DROP TABLE notes;
DROP TYPE note_type;
DROP TYPE note_visibility;

ALTER TABLE space_members
    ADD COLUMN is_game_master boolean NOT NULL DEFAULT FALSE;

CREATE TYPE access_policy AS ENUM (
    'Public',
    'Collaborative',
    'Personal',
    'Secret',
    'GameMaster'
);
CREATE TYPE scope_kind AS ENUM ('Space', 'Character');

CREATE TABLE notes (
    id uuid NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    space_id uuid NOT NULL CONSTRAINT notes_space REFERENCES spaces (id) ON DELETE CASCADE,
    title text NOT NULL DEFAULT '',
    keywords text[] NOT NULL DEFAULT '{}',
    tags text[] NOT NULL DEFAULT '{}',
    creator_id uuid CONSTRAINT notes_creator REFERENCES users (id) ON DELETE SET NULL,
    text text NOT NULL DEFAULT '',
    entities jsonb NOT NULL DEFAULT '[]',
    access_policy access_policy NOT NULL DEFAULT 'Secret',
    access_channel_id uuid CONSTRAINT note_access_channel REFERENCES channels (id),
    revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
    archived_at timestamptz,
    created timestamptz NOT NULL DEFAULT now(),
    modified timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE note_content_revisions (
    note_id uuid NOT NULL CONSTRAINT note_content_revision_note REFERENCES notes (id) ON DELETE CASCADE,
    revision bigint NOT NULL CHECK (revision > 0),
    operator_id uuid CONSTRAINT note_content_revision_operator REFERENCES users (id) ON DELETE SET NULL,
    title text NOT NULL,
    text text NOT NULL,
    entities jsonb NOT NULL DEFAULT '[]',
    created timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (note_id, revision)
);

CREATE INDEX notes_space_modified_index
    ON notes (space_id, modified DESC, id DESC);

CREATE TABLE scopes (
    id uuid NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    space_id uuid NOT NULL CONSTRAINT scope_space REFERENCES spaces (id) ON DELETE CASCADE,
    kind scope_kind NOT NULL,
    owner_id uuid CONSTRAINT scope_owner REFERENCES users (id) ON DELETE SET NULL,
    access_policy access_policy NOT NULL DEFAULT 'Secret',
    access_channel_id uuid CONSTRAINT scope_access_channel REFERENCES channels (id),
    version uuid NOT NULL DEFAULT uuidv7(),
    created timestamptz NOT NULL DEFAULT now(),
    modified timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT scope_space_id_unique UNIQUE (space_id, id)
);

CREATE UNIQUE INDEX scope_one_space_scope
    ON scopes (space_id)
    WHERE kind = 'Space';

CREATE INDEX scope_owner_index
    ON scopes (owner_id, id)
    WHERE owner_id IS NOT NULL;

UPDATE spaces
SET scope_id = uuidv7();

INSERT INTO scopes (
    id,
    space_id,
    kind,
    owner_id,
    access_policy
)
SELECT
    scope_id,
    id,
    'Space',
    owner_id,
    'Public'
FROM spaces;

ALTER TABLE spaces
    ALTER COLUMN scope_id SET NOT NULL,
    ADD CONSTRAINT space_scope_id_unique UNIQUE (scope_id),
    ADD CONSTRAINT space_scope
        FOREIGN KEY (id, scope_id)
        REFERENCES scopes (space_id, id)
        DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE characters
    ADD CONSTRAINT character_main_scope
        FOREIGN KEY (space_id, main_scope_id)
        REFERENCES scopes (space_id, id)
        DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE character_scopes (
    space_id uuid NOT NULL,
    character_id uuid NOT NULL,
    scope_id uuid NOT NULL,
    purpose text NOT NULL,
    PRIMARY KEY (character_id, purpose),
    CONSTRAINT character_scope_scope_unique UNIQUE (scope_id),
    CONSTRAINT character_scope_character
        FOREIGN KEY (space_id, character_id)
        REFERENCES characters (space_id, id)
        ON DELETE CASCADE,
    CONSTRAINT character_scope_scope
        FOREIGN KEY (space_id, scope_id)
        REFERENCES scopes (space_id, id)
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT character_scope_purpose_valid CHECK (
        purpose <> 'main'
        AND
        length(purpose) <= 64
        AND purpose ~ '^[a-z][a-z0-9_-]*$'
    )
);

CREATE TABLE entry_effects (
    id uuid NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    space_id uuid NOT NULL,
    scope_id uuid NOT NULL,
    operator_id uuid CONSTRAINT entry_effect_operator REFERENCES users (id) ON DELETE SET NULL,
    created timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT entry_effect_scope
        FOREIGN KEY (space_id, scope_id)
        REFERENCES scopes (space_id, id)
        ON DELETE CASCADE
);

CREATE INDEX entry_effect_scope_created_index
    ON entry_effects (scope_id, created DESC, id DESC);

ALTER TABLE messages
    ADD COLUMN entry_effect_id uuid
        CONSTRAINT message_entry_effect
        REFERENCES entry_effects (id)
        ON DELETE SET NULL;

CREATE UNIQUE INDEX message_entry_effect_unique
    ON messages (entry_effect_id)
    WHERE entry_effect_id IS NOT NULL;

CREATE TABLE entries (
    id uuid NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    scope_id uuid NOT NULL CONSTRAINT entry_scope REFERENCES scopes (id) ON DELETE CASCADE,
    display_name text NOT NULL,
    reference_note_id uuid CONSTRAINT entry_reference_note REFERENCES notes (id) ON DELETE SET NULL,
    tags text[] NOT NULL DEFAULT '{}',
    sort integer NOT NULL DEFAULT 0,
    metadata_version uuid NOT NULL DEFAULT uuidv7(),
    created timestamptz NOT NULL DEFAULT now(),
    modified timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT entry_scope_id_unique UNIQUE (scope_id, id)
);

CREATE TABLE entry_identifiers (
    scope_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    value citext NOT NULL,
    kind identifier_kind NOT NULL,
    PRIMARY KEY (scope_id, value),
    CONSTRAINT entry_identifier_entry
        FOREIGN KEY (scope_id, entry_id)
        REFERENCES entries (scope_id, id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX entry_identifier_one_primary
    ON entry_identifiers (entry_id)
    WHERE kind = 'Primary';

CREATE INDEX entry_identifier_entry_index
    ON entry_identifiers (entry_id, value);

CREATE INDEX entry_scope_sort_index
    ON entries (scope_id, sort, id);

CREATE INDEX entry_reference_note_index
    ON entries (reference_note_id)
    WHERE reference_note_id IS NOT NULL;

CREATE TYPE entry_history_action AS ENUM ('Create', 'Rename', 'Delete');

CREATE TABLE entry_history (
    entry_effect_id uuid NOT NULL
        CONSTRAINT entry_history_effect
        REFERENCES entry_effects (id)
        ON DELETE CASCADE,
    entry_id uuid NOT NULL,
    key text NOT NULL,
    previous_key text,
    action entry_history_action NOT NULL,
    PRIMARY KEY (entry_effect_id, entry_id),
    CONSTRAINT entry_history_rename_valid CHECK (
        (
            action = 'Rename'
            AND previous_key IS NOT NULL
            AND previous_key <> key
        )
        OR
        (
            action <> 'Rename'
            AND previous_key IS NULL
        )
    )
);

CREATE INDEX entry_history_entry_effect_index
    ON entry_history (entry_id, entry_effect_id);

CREATE TABLE entry_components (
    entry_id uuid NOT NULL
        CONSTRAINT entry_component_entry
        REFERENCES entries (id)
        ON DELETE CASCADE,
    component_type text NOT NULL,
    data jsonb NOT NULL,
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    version uuid NOT NULL DEFAULT uuidv7(),
    modified timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (entry_id, component_type),
    CONSTRAINT entry_component_type_valid CHECK (
        length(component_type) <= 200
        AND component_type ~ '^[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)+$'
    )
);

CREATE TYPE entry_component_history_action AS ENUM ('Set', 'Remove');

CREATE TABLE entry_component_history (
    entry_effect_id uuid NOT NULL
        CONSTRAINT entry_component_history_effect
        REFERENCES entry_effects (id)
        ON DELETE CASCADE,
    entry_id uuid NOT NULL,
    key text NOT NULL,
    component_type text NOT NULL,
    action entry_component_history_action NOT NULL,
    data jsonb,
    schema_version integer,
    PRIMARY KEY (entry_effect_id, entry_id, component_type),
    CONSTRAINT entry_component_history_type_valid CHECK (
        length(component_type) <= 200
        AND component_type ~ '^[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)+$'
    ),
    CONSTRAINT entry_component_history_state_valid CHECK (
        (
            action = 'Set'
            AND data IS NOT NULL
            AND schema_version IS NOT NULL
            AND schema_version > 0
        )
        OR
        (
            action = 'Remove'
            AND data IS NULL
            AND schema_version IS NULL
        )
    )
);

CREATE INDEX entry_component_history_entry_effect_index
    ON entry_component_history (
        entry_id,
        component_type,
        entry_effect_id
    );

CREATE INDEX entry_component_history_key_effect_index
    ON entry_component_history (
        key,
        entry_effect_id,
        entry_id,
        component_type
    );
