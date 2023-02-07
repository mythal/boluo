CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "hstore";
CREATE EXTENSION IF NOT EXISTS "pg_rational";


CREATE TABLE media
(
    "id"                uuid      NOT NULL DEFAULT uuid_generate_v1mc() PRIMARY KEY,
    "mime_type"         text      NOT NULL DEFAULT '',
    "uploader_id"       uuid      NOT NULL,
    "filename"          text      NOT NULL,
    "original_filename" text      NOT NULL DEFAULT '',
    "hash"              text      NOT NULL,
    "size"              integer   NOT NULL,
    "description"       text      NOT NULL DEFAULT '',
    "source"            text      NOT NULL DEFAULT '',
    "created"           timestamptz NOT NULL DEFAULT (now() at time zone 'utc')
);

CREATE TABLE users
(
    "id"          uuid      NOT NULL DEFAULT uuid_generate_v1mc() PRIMARY KEY,
    "email"       text      NOT NULL UNIQUE,
    "username"    text      NOT NULL UNIQUE,
    "nickname"    text      NOT NULL,
    "password"    text      NOT NULL,
    "bio"         text      NOT NULL DEFAULT '',
    "joined"      timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "deactivated" boolean   NOT NULL DEFAULT false,
    "avatar_id"   uuid               DEFAULT NULL
        CONSTRAINT "user_avatar" REFERENCES media (id) ON DELETE SET NULL
);

ALTER TABLE media
    ADD CONSTRAINT "media_uploader" FOREIGN KEY (uploader_id) REFERENCES users (id) ON DELETE RESTRICT;

CREATE TABLE users_extension
(
    "user_id"  uuid  NOT NULL PRIMARY KEY
        CONSTRAINT "extension_user" REFERENCES users (id) ON DELETE CASCADE,
    "settings" jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE spaces
(
    "id"                uuid      NOT NULL DEFAULT uuid_generate_v1mc() PRIMARY KEY,
    "name"              text      NOT NULL,
    "description"       text      NOT NULL DEFAULT '',
    "created"           timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "modified"          timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "owner_id"          uuid      NOT NULL
        CONSTRAINT "space_owner" REFERENCES users (id) ON DELETE RESTRICT,
    "is_public"         boolean   NOT NULL DEFAULT true,
    "deleted"           boolean   NOT NULL DEFAULT false,
    "password"          text      NOT NULL DEFAULT '',    -- plain text
    "language"          text      NOT NULL DEFAULT '',    -- ISO 639-1
    "default_dice_type" text      NOT NULL DEFAULT 'd20', -- d20, d100, FATE ...
    "invite_token"      uuid      NOT NULL DEFAULT gen_random_uuid(),
    "explorable"        boolean   NOT NULL DEFAULT false,
    "allow_spectator"   boolean   NOT NULL DEFAULT true
);

CREATE TABLE space_members
(
    "user_id"   uuid      NOT NULL
        CONSTRAINT "space_member_user" REFERENCES users (id) ON DELETE CASCADE,
    "space_id"  uuid      NOT NULL
        CONSTRAINT "space_member_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "is_admin"  boolean   NOT NULL DEFAULT false,
    "join_date" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT "user_space_id_pair" PRIMARY KEY ("user_id", "space_id")
);

CREATE TABLE channels
(
    "id"                   uuid      NOT NULL DEFAULT uuid_generate_v1mc() PRIMARY KEY,
    "name"                 text      NOT NULL,
    "topic"                text      NOT NULL DEFAULT '',
    "space_id"             uuid      NOT NULL
        CONSTRAINT "channel_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "created"              timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "is_public"            boolean   NOT NULL DEFAULT true,
    "deleted"              boolean   NOT NULL DEFAULT false,
    "default_dice_type"    text      NOT NULL DEFAULT 'd20',
    "default_roll_command" text      NOT NULL DEFAULT 'd',
    "is_document"          bool      NOT NULL DEFAULT false,
    "old_name"             text      NOT NULL DEFAULT '',
    CONSTRAINT "unique_channel_name_in_space" UNIQUE (space_id, name)
);

CREATE TABLE channel_members
(
    "user_id"        uuid      NOT NULL
        CONSTRAINT "channel_member_user" REFERENCES users (id) ON DELETE CASCADE,
    "channel_id"     uuid      NOT NULL
        CONSTRAINT "channel_member_channel" REFERENCES channels (id) ON DELETE CASCADE,
    "join_date"      timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "character_name" text      NOT NULL,
    text_color       text               DEFAULT NULL,
    is_joined        boolean   NOT NULL DEFAULT true,
    is_master        bool      NOT NULL DEFAULT false,
    CONSTRAINT "user_channel_id_pair" PRIMARY KEY ("user_id", "channel_id")
);

CREATE TABLE messages
(
    "id"                uuid      NOT NULL DEFAULT uuid_generate_v1mc() PRIMARY KEY,
    "sender_id"         uuid      NOT NULL
        CONSTRAINT "message_sender" REFERENCES users (id) ON DELETE CASCADE,
    "channel_id"        uuid      NOT NULL
        CONSTRAINT "message_channel" REFERENCES channels (id) ON DELETE CASCADE,
    "parent_message_id" uuid               DEFAULT null
        CONSTRAINT "message_parent" REFERENCES messages (id) ON DELETE CASCADE,
    "name"              text      NOT NULL,
    "media_id"          uuid               DEFAULT null,
    "seed"              bytea     NOT NULL DEFAULT gen_random_bytes(4),
    "deleted"           boolean   NOT NULL DEFAULT false,
    "in_game"           boolean   NOT NULL DEFAULT false,
    "is_action"         boolean   NOT NULL DEFAULT false,
    "is_master"         boolean   NOT NULL DEFAULT false,
    "pinned"            boolean   NOT NULL DEFAULT false,
    "tags"              text[]    NOT NULL DEFAULT '{}',
    -- A mark that represents the message was invalid.
    "folded"            boolean   NOT NULL DEFAULT false,
    "text"              text      NOT NULL DEFAULT '',
    -- whisper_to_users values mean
    -- null: public message.
    -- []: only master is able to read the message.
    -- [user1, user2]: both master, user1 and user2 are able to read the message.
    "whisper_to_users"  uuid[]             DEFAULT null,
    "entities"          jsonb     NOT NULL DEFAULT '[]',
    "created"           timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "modified"          timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "order_date"        timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "order_offset"      integer   NOT NULL DEFAULT 0,
    "pos"               float     NOT NULL DEFAULT 0.0
);

ALTER TABLE messages
    ADD CONSTRAINT pos_unique UNIQUE (channel_id, pos) DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "message_pos" ON messages (pos);
CREATE INDEX "message_tags" ON messages USING GIN (tags);
CREATE INDEX "message_channel_index" ON messages USING btree (channel_id);

CREATE TABLE restrained_members
(
    "user_id"         uuid      NOT NULL
        CONSTRAINT "restrained_member_user" REFERENCES users (id) ON DELETE CASCADE,
    "space_id"        uuid      NOT NULL
        CONSTRAINT "restrained_member_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "blocked"         boolean   NOT NULL DEFAULT false,
    "muted"           boolean   NOT NULL DEFAULT false,
    "restrained_date" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "operator_id"     uuid               DEFAULT null
        CONSTRAINT "restrain_operator" REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT "restrained_space_id_pair" PRIMARY KEY (user_id, space_id)
);

CREATE TYPE event_type AS ENUM (
    'Joined',
    'Left',
    'NewMaster',
    'NewAdmin'
    );

CREATE TABLE events
(
    "id"          uuid       NOT NULL PRIMARY KEY,
    "type"        event_type NOT NULL,
    "channel_id"  uuid                DEFAULT NULL
        CONSTRAINT "event_channel" REFERENCES channels (id) ON DELETE CASCADE,
    "space_id"    uuid                DEFAULT NULL
        CONSTRAINT "event_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "receiver_id" uuid
        CONSTRAINT "event_receiver" REFERENCES users (id) ON DELETE CASCADE,
    "payload"     jsonb      NOT NULL DEFAULT '{}',
    "created"     timestamptz  NOT NULL default (now() at time zone 'utc')
);
