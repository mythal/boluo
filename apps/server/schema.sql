CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE EXTENSION IF NOT EXISTS "hstore";

-- From https://wiki.postgresql.org/wiki/User-specified_ordering_with_fractions
CREATE OR REPLACE FUNCTION find_intermediate (p1 integer, q1 integer, p2 integer, q2 integer, OUT p integer, OUT q integer)
LANGUAGE plpgsql
IMMUTABLE STRICT
AS $f$
DECLARE
    pl integer := 0;
    ql integer := 1;
    ph integer := 1;
    qh integer := 0;
BEGIN
    IF p1::bigint * q2 = p2::bigint * q1 THEN
        p := p1;
        q := q1;
        RETURN;
    END IF;
    IF (p1::bigint * q2 + 1) <> (p2::bigint * q1) THEN
        LOOP
            p := pl + ph;
            q := ql + qh;
            IF (p::bigint * q1 <= q::bigint * p1) THEN
                pl := p;
                ql := q;
            ELSIF (p2::bigint * q <= q2::bigint * p) THEN
                ph := p;
                qh := q;
            ELSE
                exit;
            END IF;
        END LOOP;
    ELSE
        p := p1 + p2;
        q := q1 + q2;
    END IF;
END;
$f$;

CREATE TABLE media (
    "id" uuid NOT NULL DEFAULT uuid_generate_v1mc () PRIMARY KEY,
    "mime_type" text NOT NULL DEFAULT '',
    "uploader_id" uuid NOT NULL,
    "filename" text NOT NULL,
    "original_filename" text NOT NULL DEFAULT '',
    "hash" text NOT NULL,
    "size" integer NOT NULL,
    "description" text NOT NULL DEFAULT '',
    "source" text NOT NULL DEFAULT '',
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc')
);

CREATE TABLE proxies (
    "name" text NOT NULL PRIMARY KEY,
    "url" text NOT NULL,
    "is_enabled" boolean NOT NULL DEFAULT TRUE,
    "region" text NOT NULL DEFAULT '',
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc')
);

CREATE TABLE users (
    "id" uuid NOT NULL DEFAULT uuid_generate_v1mc () PRIMARY KEY,
    "email" text NOT NULL UNIQUE,
    "username" text NOT NULL UNIQUE,
    "nickname" text NOT NULL,
    "password" text NOT NULL,
    "bio" text NOT NULL DEFAULT '',
    "joined" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "deactivated" boolean NOT NULL DEFAULT FALSE,
    "avatar_id" uuid DEFAULT NULL CONSTRAINT "user_avatar" REFERENCES media (id) ON DELETE SET NULL,
    "default_color" text NOT NULL DEFAULT ''
);

ALTER TABLE media
    ADD CONSTRAINT "media_uploader" FOREIGN KEY (uploader_id) REFERENCES users (id) ON DELETE RESTRICT;

CREATE TABLE users_extension (
    "user_id" uuid NOT NULL PRIMARY KEY CONSTRAINT "extension_user" REFERENCES users (id) ON DELETE CASCADE,
    "settings" jsonb NOT NULL DEFAULT '{}',
    "email_verified_at" timestamptz DEFAULT NULL
);

CREATE TABLE spaces (
    "id" uuid NOT NULL DEFAULT uuid_generate_v1mc () PRIMARY KEY,
    "name" text NOT NULL,
    "description" text NOT NULL DEFAULT '',
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "modified" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "owner_id" uuid NOT NULL CONSTRAINT "space_owner" REFERENCES users (id) ON DELETE RESTRICT,
    "is_public" boolean NOT NULL DEFAULT TRUE,
    "deleted" boolean NOT NULL DEFAULT FALSE,
    "password" text NOT NULL DEFAULT '', -- plain text
    "language" text NOT NULL DEFAULT '', -- ISO 639-1
    "default_dice_type" text NOT NULL DEFAULT 'd20', -- d20, d100, FATE ...
    "explorable" boolean NOT NULL DEFAULT FALSE,
    "invite_token" uuid NOT NULL DEFAULT gen_random_uuid (),
    "allow_spectator" boolean NOT NULL DEFAULT TRUE,
    "latest_activity" timestamptz NOT NULL DEFAULT (now() at time zone 'utc')
);

CREATE TABLE spaces_extension (
    "space_id" uuid NOT NULL PRIMARY KEY CONSTRAINT "extension_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "settings" jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE space_members (
    "user_id" uuid NOT NULL CONSTRAINT "space_member_user" REFERENCES users (id) ON DELETE CASCADE,
    "space_id" uuid NOT NULL CONSTRAINT "space_member_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "is_admin" boolean NOT NULL DEFAULT FALSE,
    "join_date" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT "user_space_id_pair" PRIMARY KEY ("user_id", "space_id")
);

CREATE TABLE channels (
    "id" uuid NOT NULL DEFAULT uuid_generate_v1mc () PRIMARY KEY,
    "name" text NOT NULL,
    "topic" text NOT NULL DEFAULT '',
    "space_id" uuid NOT NULL CONSTRAINT "channel_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "is_public" boolean NOT NULL DEFAULT TRUE,
    "deleted" boolean NOT NULL DEFAULT FALSE,
    "default_dice_type" text NOT NULL DEFAULT 'd20',
    "default_roll_command" text NOT NULL DEFAULT 'd',
    "is_document" bool NOT NULL DEFAULT FALSE,
    "old_name" text NOT NULL DEFAULT '',
    "type" text NOT NULL DEFAULT 'in_game',
    CONSTRAINT "unique_channel_name_in_space" UNIQUE (space_id, name)
);

CREATE TABLE channel_members (
    "user_id" uuid NOT NULL CONSTRAINT "channel_member_user" REFERENCES users (id) ON DELETE CASCADE,
    "channel_id" uuid NOT NULL CONSTRAINT "channel_member_channel" REFERENCES channels (id) ON DELETE CASCADE,
    "join_date" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "character_name" text NOT NULL,
    text_color text DEFAULT NULL,
    is_joined boolean NOT NULL DEFAULT TRUE,
    is_master bool NOT NULL DEFAULT FALSE,
    CONSTRAINT "user_channel_id_pair" PRIMARY KEY ("user_id", "channel_id")
);

CREATE TABLE messages (
    "id" uuid NOT NULL DEFAULT uuid_generate_v1mc () PRIMARY KEY,
    "sender_id" uuid NOT NULL CONSTRAINT "message_sender" REFERENCES users (id) ON DELETE CASCADE,
    "channel_id" uuid NOT NULL CONSTRAINT "message_channel" REFERENCES channels (id) ON DELETE CASCADE,
    "parent_message_id" uuid DEFAULT NULL CONSTRAINT "message_parent" REFERENCES messages (id) ON DELETE CASCADE,
    "name" text NOT NULL,
    "media_id" uuid DEFAULT NULL,
    "seed" bytea NOT NULL DEFAULT gen_random_bytes(4),
    "deleted" boolean NOT NULL DEFAULT FALSE,
    "in_game" boolean NOT NULL DEFAULT FALSE,
    "is_action" boolean NOT NULL DEFAULT FALSE,
    "is_master" boolean NOT NULL DEFAULT FALSE,
    "pinned" boolean NOT NULL DEFAULT FALSE,
    "tags" text[] NOT NULL DEFAULT '{}',
    -- A mark that represents the message was invalid.
    "folded" boolean NOT NULL DEFAULT FALSE,
    "text" text NOT NULL DEFAULT '',
    -- whisper_to_users values mean
    -- null: public message.
    -- []: only master is able to read the message.
    -- [user1, user2]: both master, user1 and user2 are able to read the message.
    "whisper_to_users" uuid[] DEFAULT NULL,
    "entities" jsonb NOT NULL DEFAULT '[]',
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "modified" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "pos_p" integer NOT NULL,
    "pos_q" integer NOT NULL,
    "pos" float8 GENERATED ALWAYS AS (pos_p::float8 / pos_q) STORED,
    "color" text NOT NULL DEFAULT ''
);

ALTER TABLE messages
    ADD CONSTRAINT pos_unique UNIQUE (channel_id, pos) DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "message_tags" ON messages USING GIN (tags);

CREATE TABLE restrained_members (
    "user_id" uuid NOT NULL CONSTRAINT "restrained_member_user" REFERENCES users (id) ON DELETE CASCADE,
    "space_id" uuid NOT NULL CONSTRAINT "restrained_member_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "blocked" boolean NOT NULL DEFAULT FALSE,
    "muted" boolean NOT NULL DEFAULT FALSE,
    "restrained_date" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "operator_id" uuid DEFAULT NULL CONSTRAINT "restrain_operator" REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT "restrained_space_id_pair" PRIMARY KEY (user_id, space_id)
);

CREATE TYPE event_type AS ENUM (
    'Joined',
    'Left',
    'NewMaster',
    'NewAdmin'
);

CREATE TABLE events (
    "id" uuid NOT NULL PRIMARY KEY,
    "type" event_type NOT NULL,
    "channel_id" uuid DEFAULT NULL CONSTRAINT "event_channel" REFERENCES channels (id) ON DELETE CASCADE,
    "space_id" uuid DEFAULT NULL CONSTRAINT "event_space" REFERENCES spaces (id) ON DELETE CASCADE,
    "receiver_id" uuid CONSTRAINT "event_receiver" REFERENCES users (id) ON DELETE CASCADE,
    "payload" jsonb NOT NULL DEFAULT '{}',
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc')
);

CREATE TABLE user_sessions (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4 () PRIMARY KEY,
    "user_id" uuid NOT NULL CONSTRAINT "session_user" REFERENCES users (id) ON DELETE CASCADE,
    "active" boolean NOT NULL DEFAULT TRUE,
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "latest_activity" timestamptz NOT NULL DEFAULT (now() at time zone 'utc')
);

CREATE TABLE reset_tokens (
    "token" uuid NOT NULL DEFAULT uuid_generate_v4 () PRIMARY KEY,
    "user_id" uuid NOT NULL CONSTRAINT "password_reset_user" REFERENCES users (id) ON DELETE CASCADE,
    "created" timestamptz NOT NULL DEFAULT (now() at time zone 'utc'),
    "used_at" timestamptz DEFAULT NULL,
    "invalidated_at" timestamptz DEFAULT NULL
);
CREATE INDEX "reset_token_user" ON reset_tokens (user_id);
