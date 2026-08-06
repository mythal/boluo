--
-- PostgreSQL database dump
--

-- Dumped from database version 19beta2
-- Dumped by pg_dump version 19beta2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: hstore; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA public;


--
-- Name: EXTENSION hstore; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION hstore IS 'data type for storing sets of (key, value) pairs';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: access_policy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.access_policy AS ENUM (
    'Public',
    'Collaborative',
    'Personal',
    'Secret',
    'GameMaster'
);


--
-- Name: asset_policy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_policy AS ENUM (
    'Unlisted',
    'Listed'
);


--
-- Name: entry_component_history_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.entry_component_history_action AS ENUM (
    'Set',
    'Remove'
);


--
-- Name: entry_component_payload_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.entry_component_payload_type AS ENUM (
    'Json',
    'Asset'
);


--
-- Name: entry_history_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.entry_history_action AS ENUM (
    'Create',
    'Rename',
    'Delete'
);


--
-- Name: event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_type AS ENUM (
    'Joined',
    'Left',
    'NewMaster',
    'NewAdmin'
);


--
-- Name: identifier_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.identifier_kind AS ENUM (
    'Primary',
    'Alias'
);


--
-- Name: scope_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.scope_kind AS ENUM (
    'Space',
    'Character'
);


--
-- Name: find_intermediate(integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_intermediate(p1 integer, q1 integer, p2 integer, q2 integer, OUT p integer, OUT q integer) RETURNS record
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _sqlx_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._sqlx_migrations (
    version bigint NOT NULL,
    description text NOT NULL,
    installed_on timestamp with time zone DEFAULT now() NOT NULL,
    success boolean NOT NULL,
    checksum bytea NOT NULL,
    execution_time bigint NOT NULL
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id uuid DEFAULT uuidv7() NOT NULL,
    space_id uuid NOT NULL,
    media_id uuid NOT NULL,
    creator_id uuid,
    name text NOT NULL,
    policy public.asset_policy DEFAULT 'Unlisted'::public.asset_policy NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT asset_name_valid CHECK (((length(name) >= 1) AND (length(name) <= 100)))
);


--
-- Name: channel_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_members (
    user_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    join_date timestamp with time zone DEFAULT now() NOT NULL,
    character_name text NOT NULL,
    text_color text,
    is_joined boolean DEFAULT true NOT NULL,
    is_master boolean DEFAULT false NOT NULL,
    character_id uuid
);


--
-- Name: channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channels (
    id uuid DEFAULT public.uuid_generate_v1mc() NOT NULL,
    name text NOT NULL,
    topic text DEFAULT ''::text NOT NULL,
    space_id uuid NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    default_dice_type text DEFAULT 'd20'::text NOT NULL,
    default_roll_command text DEFAULT 'd'::text NOT NULL,
    is_document boolean DEFAULT false NOT NULL,
    old_name text DEFAULT ''::text NOT NULL,
    type text DEFAULT 'in_game'::text NOT NULL,
    is_archived boolean DEFAULT false NOT NULL
);


--
-- Name: character_identifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_identifiers (
    space_id uuid NOT NULL,
    character_id uuid NOT NULL,
    value public.citext NOT NULL,
    kind public.identifier_kind NOT NULL
);


--
-- Name: character_scopes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_scopes (
    space_id uuid NOT NULL,
    character_id uuid NOT NULL,
    scope_id uuid NOT NULL,
    purpose text NOT NULL,
    CONSTRAINT character_scope_purpose_valid CHECK (((purpose <> 'main'::text) AND (length(purpose) <= 64) AND (purpose ~ '^[a-z][a-z0-9_-]*$'::text)))
);


--
-- Name: characters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.characters (
    id uuid DEFAULT uuidv7() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    color text DEFAULT ''::text NOT NULL,
    space_id uuid NOT NULL,
    main_scope_id uuid NOT NULL,
    archived_at timestamp with time zone,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    modified timestamp with time zone DEFAULT now() NOT NULL,
    version uuid DEFAULT uuidv7() NOT NULL
);


--
-- Name: entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entries (
    id uuid DEFAULT uuidv7() NOT NULL,
    scope_id uuid NOT NULL,
    display_name text NOT NULL,
    reference_note_id uuid,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    metadata_version uuid DEFAULT uuidv7() NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    modified timestamp with time zone DEFAULT now() NOT NULL,
    pos_p integer NOT NULL,
    pos_q integer NOT NULL,
    pos double precision GENERATED ALWAYS AS (((pos_p)::double precision / (pos_q)::double precision)) STORED,
    CONSTRAINT entry_position_valid CHECK (((pos_p >= 0) AND (pos_q > 0)))
);


--
-- Name: entry_component_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entry_component_history (
    entry_effect_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    key text NOT NULL,
    component_type text NOT NULL,
    action public.entry_component_history_action NOT NULL,
    payload jsonb,
    CONSTRAINT entry_component_history_state_valid CHECK ((((action = 'Set'::public.entry_component_history_action) AND (payload IS NOT NULL)) OR ((action = 'Remove'::public.entry_component_history_action) AND (payload IS NULL)))),
    CONSTRAINT entry_component_history_type_valid CHECK (((length(component_type) <= 200) AND (component_type ~ '^[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)+$'::text)))
);


--
-- Name: entry_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entry_components (
    entry_id uuid NOT NULL,
    component_type text NOT NULL,
    payload_type public.entry_component_payload_type NOT NULL,
    version uuid DEFAULT uuidv7() NOT NULL,
    modified timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT entry_component_type_valid CHECK (((length(component_type) <= 200) AND (component_type ~ '^[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)+$'::text)))
);


--
-- Name: entry_components_asset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entry_components_asset (
    entry_id uuid NOT NULL,
    component_type text NOT NULL,
    payload_type public.entry_component_payload_type DEFAULT 'Asset'::public.entry_component_payload_type NOT NULL,
    scope_id uuid NOT NULL,
    space_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    CONSTRAINT entry_components_asset_payload_type_valid CHECK ((payload_type = 'Asset'::public.entry_component_payload_type))
);


--
-- Name: entry_components_json; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entry_components_json (
    entry_id uuid NOT NULL,
    component_type text NOT NULL,
    payload_type public.entry_component_payload_type DEFAULT 'Json'::public.entry_component_payload_type NOT NULL,
    data jsonb NOT NULL,
    schema_version integer DEFAULT 1 NOT NULL,
    CONSTRAINT entry_components_json_payload_type_valid CHECK ((payload_type = 'Json'::public.entry_component_payload_type)),
    CONSTRAINT entry_components_json_schema_version_valid CHECK ((schema_version > 0))
);


--
-- Name: entry_effects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entry_effects (
    id uuid DEFAULT uuidv7() NOT NULL,
    space_id uuid NOT NULL,
    scope_id uuid NOT NULL,
    operator_id uuid,
    created timestamp with time zone DEFAULT now() NOT NULL,
    message_id uuid
);


--
-- Name: entry_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entry_history (
    entry_effect_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    key text NOT NULL,
    previous_key text,
    action public.entry_history_action NOT NULL,
    CONSTRAINT entry_history_rename_valid CHECK ((((action = 'Rename'::public.entry_history_action) AND (previous_key IS NOT NULL) AND (previous_key <> key)) OR ((action <> 'Rename'::public.entry_history_action) AND (previous_key IS NULL))))
);


--
-- Name: entry_identifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entry_identifiers (
    scope_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    value public.citext NOT NULL,
    kind public.identifier_kind NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid NOT NULL,
    type public.event_type NOT NULL,
    channel_id uuid,
    space_id uuid,
    receiver_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media (
    id uuid DEFAULT public.uuid_generate_v1mc() NOT NULL,
    mime_type text DEFAULT ''::text NOT NULL,
    uploader_id uuid NOT NULL,
    filename text NOT NULL,
    original_filename text DEFAULT ''::text NOT NULL,
    hash text NOT NULL,
    size integer NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    source text DEFAULT ''::text NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v1mc() NOT NULL,
    sender_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    parent_message_id uuid,
    name text NOT NULL,
    media_id uuid,
    seed bytea DEFAULT public.gen_random_bytes(4) NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    in_game boolean DEFAULT false NOT NULL,
    is_action boolean DEFAULT false NOT NULL,
    is_master boolean DEFAULT false NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    folded boolean DEFAULT false NOT NULL,
    text text DEFAULT ''::text NOT NULL,
    whisper_to_users uuid[],
    entities jsonb DEFAULT '[]'::jsonb NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    modified timestamp with time zone DEFAULT now() NOT NULL,
    pos_p integer NOT NULL,
    pos_q integer NOT NULL,
    pos double precision GENERATED ALWAYS AS (((pos_p)::double precision / (pos_q)::double precision)) STORED,
    color text DEFAULT ''::text NOT NULL,
    rev integer DEFAULT 0 NOT NULL,
    character_id uuid,
    portrait_id uuid,
    has_entry_effects boolean DEFAULT false NOT NULL
);


--
-- Name: note_content_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_content_revisions (
    note_id uuid NOT NULL,
    revision bigint NOT NULL,
    operator_id uuid,
    title text NOT NULL,
    text text NOT NULL,
    entities jsonb DEFAULT '[]'::jsonb NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT note_content_revisions_revision_check CHECK ((revision > 0))
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT uuidv7() NOT NULL,
    space_id uuid NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    keywords text[] DEFAULT '{}'::text[] NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    creator_id uuid,
    text text DEFAULT ''::text NOT NULL,
    entities jsonb DEFAULT '[]'::jsonb NOT NULL,
    access_policy public.access_policy DEFAULT 'Secret'::public.access_policy NOT NULL,
    access_channel_id uuid,
    revision bigint DEFAULT 1 NOT NULL,
    archived_at timestamp with time zone,
    created timestamp with time zone DEFAULT now() NOT NULL,
    modified timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notes_revision_check CHECK ((revision > 0))
);


--
-- Name: proxies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxies (
    name text NOT NULL,
    url text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    region text DEFAULT ''::text NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reset_tokens (
    token uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone,
    invalidated_at timestamp with time zone
);


--
-- Name: restrained_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restrained_members (
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    blocked boolean DEFAULT false NOT NULL,
    muted boolean DEFAULT false NOT NULL,
    restrained_date timestamp with time zone DEFAULT now() NOT NULL,
    operator_id uuid
);


--
-- Name: scopes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scopes (
    id uuid DEFAULT uuidv7() NOT NULL,
    space_id uuid NOT NULL,
    kind public.scope_kind NOT NULL,
    owner_id uuid,
    access_policy public.access_policy DEFAULT 'Secret'::public.access_policy NOT NULL,
    access_channel_id uuid,
    version uuid DEFAULT uuidv7() NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    modified timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: space_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.space_members (
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    join_date timestamp with time zone DEFAULT now() NOT NULL,
    is_game_master boolean DEFAULT false NOT NULL
);


--
-- Name: spaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spaces (
    id uuid DEFAULT uuidv7() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    modified timestamp with time zone DEFAULT now() NOT NULL,
    owner_id uuid NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    password text DEFAULT ''::text NOT NULL,
    language text DEFAULT ''::text NOT NULL,
    default_dice_type text DEFAULT 'd20'::text NOT NULL,
    explorable boolean DEFAULT false NOT NULL,
    invite_token uuid DEFAULT gen_random_uuid() NOT NULL,
    allow_spectator boolean DEFAULT true NOT NULL,
    latest_activity timestamp with time zone DEFAULT now() NOT NULL,
    scope_id uuid NOT NULL
);


--
-- Name: spaces_extension; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spaces_extension (
    space_id uuid NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    latest_activity timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v1mc() NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    nickname text NOT NULL,
    password text NOT NULL,
    bio text DEFAULT ''::text NOT NULL,
    joined timestamp with time zone DEFAULT now() NOT NULL,
    deactivated boolean DEFAULT false NOT NULL,
    avatar_id uuid,
    default_color text DEFAULT ''::text NOT NULL
);


--
-- Name: users_extension; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_extension (
    user_id uuid NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    email_verified_at timestamp with time zone
);


--
-- Name: _sqlx_migrations _sqlx_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._sqlx_migrations
    ADD CONSTRAINT _sqlx_migrations_pkey PRIMARY KEY (version);


--
-- Name: assets asset_space_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT asset_space_id_unique UNIQUE (space_id, id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: character_identifiers character_identifier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_identifiers
    ADD CONSTRAINT character_identifier_pkey PRIMARY KEY (space_id, value);


--
-- Name: characters character_main_scope_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT character_main_scope_unique UNIQUE (main_scope_id);


--
-- Name: character_scopes character_scope_scope_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_scopes
    ADD CONSTRAINT character_scope_scope_unique UNIQUE (scope_id);


--
-- Name: character_scopes character_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_scopes
    ADD CONSTRAINT character_scopes_pkey PRIMARY KEY (character_id, purpose);


--
-- Name: characters character_space_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT character_space_id_unique UNIQUE (space_id, id);


--
-- Name: characters characters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_pkey PRIMARY KEY (id);


--
-- Name: entries entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entries_pkey PRIMARY KEY (id);


--
-- Name: entry_component_history entry_component_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_component_history
    ADD CONSTRAINT entry_component_history_pkey PRIMARY KEY (entry_effect_id, entry_id, component_type);


--
-- Name: entry_components entry_component_payload_type_identity; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_components
    ADD CONSTRAINT entry_component_payload_type_identity UNIQUE (entry_id, component_type, payload_type);


--
-- Name: entry_components_asset entry_components_asset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_components_asset
    ADD CONSTRAINT entry_components_asset_pkey PRIMARY KEY (entry_id, component_type);


--
-- Name: entry_components_json entry_components_json_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_components_json
    ADD CONSTRAINT entry_components_json_pkey PRIMARY KEY (entry_id, component_type);


--
-- Name: entry_components entry_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_components
    ADD CONSTRAINT entry_components_pkey PRIMARY KEY (entry_id, component_type);


--
-- Name: entry_effects entry_effects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_effects
    ADD CONSTRAINT entry_effects_pkey PRIMARY KEY (id);


--
-- Name: entry_history entry_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_history
    ADD CONSTRAINT entry_history_pkey PRIMARY KEY (entry_effect_id, entry_id);


--
-- Name: entry_identifiers entry_identifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_identifiers
    ADD CONSTRAINT entry_identifiers_pkey PRIMARY KEY (scope_id, value);


--
-- Name: entries entry_scope_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entry_scope_id_unique UNIQUE (scope_id, id);


--
-- Name: entries entry_scope_position_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entry_scope_position_unique UNIQUE (scope_id, pos) DEFERRABLE;


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: note_content_revisions note_content_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_content_revisions
    ADD CONSTRAINT note_content_revisions_pkey PRIMARY KEY (note_id, revision);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: messages pos_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT pos_unique UNIQUE (channel_id, pos) DEFERRABLE;


--
-- Name: proxies proxies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxies
    ADD CONSTRAINT proxies_pkey PRIMARY KEY (name);


--
-- Name: reset_tokens reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reset_tokens
    ADD CONSTRAINT reset_tokens_pkey PRIMARY KEY (token);


--
-- Name: restrained_members restrained_space_id_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restrained_members
    ADD CONSTRAINT restrained_space_id_pair PRIMARY KEY (user_id, space_id);


--
-- Name: scopes scope_space_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scopes
    ADD CONSTRAINT scope_space_id_unique UNIQUE (space_id, id);


--
-- Name: scopes scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scopes
    ADD CONSTRAINT scopes_pkey PRIMARY KEY (id);


--
-- Name: spaces space_scope_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT space_scope_id_unique UNIQUE (scope_id);


--
-- Name: spaces_extension spaces_extension_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spaces_extension
    ADD CONSTRAINT spaces_extension_pkey PRIMARY KEY (space_id);


--
-- Name: spaces spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_pkey PRIMARY KEY (id);


--
-- Name: channels unique_channel_name_in_space; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT unique_channel_name_in_space UNIQUE (space_id, name);


--
-- Name: channel_members user_channel_id_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_members
    ADD CONSTRAINT user_channel_id_pair PRIMARY KEY (user_id, channel_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: space_members user_space_id_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_members
    ADD CONSTRAINT user_space_id_pair PRIMARY KEY (user_id, space_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users_extension users_extension_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_extension
    ADD CONSTRAINT users_extension_pkey PRIMARY KEY (user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: asset_space_created_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX asset_space_created_index ON public.assets USING btree (space_id, created DESC, id DESC);


--
-- Name: channel_member_character_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX channel_member_character_index ON public.channel_members USING btree (character_id) WHERE (character_id IS NOT NULL);


--
-- Name: channel_members_channel_id_is_joined_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX channel_members_channel_id_is_joined_index ON public.channel_members USING btree (channel_id, is_joined);


--
-- Name: character_identifier_character_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX character_identifier_character_index ON public.character_identifiers USING btree (character_id, value);


--
-- Name: character_identifier_one_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX character_identifier_one_primary ON public.character_identifiers USING btree (character_id) WHERE (kind = 'Primary'::public.identifier_kind);


--
-- Name: character_space_modified_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX character_space_modified_index ON public.characters USING btree (space_id, modified DESC);


--
-- Name: entry_component_history_entry_effect_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entry_component_history_entry_effect_index ON public.entry_component_history USING btree (entry_id, component_type, entry_effect_id);


--
-- Name: entry_component_history_key_effect_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entry_component_history_key_effect_index ON public.entry_component_history USING btree (key, entry_effect_id, entry_id, component_type);


--
-- Name: entry_components_asset_asset_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entry_components_asset_asset_index ON public.entry_components_asset USING btree (space_id, asset_id);


--
-- Name: entry_components_asset_scope_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entry_components_asset_scope_index ON public.entry_components_asset USING btree (space_id, scope_id, entry_id);


--
-- Name: entry_effect_message_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entry_effect_message_index ON public.entry_effects USING btree (message_id, created, id) WHERE (message_id IS NOT NULL);


--
-- Name: entry_effect_scope_created_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entry_effect_scope_created_index ON public.entry_effects USING btree (scope_id, created DESC, id DESC);


--
-- Name: entry_history_entry_effect_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entry_history_entry_effect_index ON public.entry_history USING btree (entry_id, entry_effect_id);


--
-- Name: entry_identifier_entry_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entry_identifier_entry_index ON public.entry_identifiers USING btree (entry_id, value);


--
-- Name: entry_identifier_one_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX entry_identifier_one_primary ON public.entry_identifiers USING btree (entry_id) WHERE (kind = 'Primary'::public.identifier_kind);


--
-- Name: entry_reference_note_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entry_reference_note_index ON public.entries USING btree (reference_note_id) WHERE (reference_note_id IS NOT NULL);


--
-- Name: entry_scope_position_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entry_scope_position_index ON public.entries USING btree (scope_id, pos, id);


--
-- Name: message_character_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_character_index ON public.messages USING btree (character_id, created DESC) WHERE (character_id IS NOT NULL);


--
-- Name: message_portrait_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_portrait_index ON public.messages USING btree (portrait_id, created DESC) WHERE (portrait_id IS NOT NULL);


--
-- Name: message_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_tags ON public.messages USING gin (tags);


--
-- Name: notes_space_modified_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_space_modified_index ON public.notes USING btree (space_id, modified DESC, id DESC);


--
-- Name: reset_token_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reset_token_user ON public.reset_tokens USING btree (user_id);


--
-- Name: scope_one_space_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX scope_one_space_scope ON public.scopes USING btree (space_id) WHERE (kind = 'Space'::public.scope_kind);


--
-- Name: scope_owner_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scope_owner_index ON public.scopes USING btree (owner_id, id) WHERE (owner_id IS NOT NULL);


--
-- Name: space_members_space_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX space_members_space_id_index ON public.space_members USING btree (space_id);


--
-- Name: assets asset_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT asset_creator FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: assets asset_media; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT asset_media FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE RESTRICT;


--
-- Name: assets asset_space; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT asset_space FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: channel_members channel_member_channel; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_members
    ADD CONSTRAINT channel_member_channel FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


--
-- Name: channel_members channel_member_character; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_members
    ADD CONSTRAINT channel_member_character FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE SET NULL;


--
-- Name: channel_members channel_member_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_members
    ADD CONSTRAINT channel_member_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: channels channel_space; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channel_space FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: character_identifiers character_identifier_character; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_identifiers
    ADD CONSTRAINT character_identifier_character FOREIGN KEY (space_id, character_id) REFERENCES public.characters(space_id, id) ON DELETE CASCADE;


--
-- Name: characters character_main_scope; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT character_main_scope FOREIGN KEY (space_id, main_scope_id) REFERENCES public.scopes(space_id, id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: character_scopes character_scope_character; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_scopes
    ADD CONSTRAINT character_scope_character FOREIGN KEY (space_id, character_id) REFERENCES public.characters(space_id, id) ON DELETE CASCADE;


--
-- Name: character_scopes character_scope_scope; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_scopes
    ADD CONSTRAINT character_scope_scope FOREIGN KEY (space_id, scope_id) REFERENCES public.scopes(space_id, id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: characters character_space; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT character_space FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: entry_components entry_component_entry; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_components
    ADD CONSTRAINT entry_component_entry FOREIGN KEY (entry_id) REFERENCES public.entries(id) ON DELETE CASCADE;


--
-- Name: entry_component_history entry_component_history_effect; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_component_history
    ADD CONSTRAINT entry_component_history_effect FOREIGN KEY (entry_effect_id) REFERENCES public.entry_effects(id) ON DELETE CASCADE;


--
-- Name: entry_components_asset entry_components_asset_asset; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_components_asset
    ADD CONSTRAINT entry_components_asset_asset FOREIGN KEY (space_id, asset_id) REFERENCES public.assets(space_id, id) ON DELETE RESTRICT;


--
-- Name: entry_components_asset entry_components_asset_entry; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_components_asset
    ADD CONSTRAINT entry_components_asset_entry FOREIGN KEY (scope_id, entry_id) REFERENCES public.entries(scope_id, id) ON DELETE CASCADE;


--
-- Name: entry_components_asset entry_components_asset_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_components_asset
    ADD CONSTRAINT entry_components_asset_parent FOREIGN KEY (entry_id, component_type, payload_type) REFERENCES public.entry_components(entry_id, component_type, payload_type) ON DELETE CASCADE;


--
-- Name: entry_components_asset entry_components_asset_scope; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_components_asset
    ADD CONSTRAINT entry_components_asset_scope FOREIGN KEY (space_id, scope_id) REFERENCES public.scopes(space_id, id) ON DELETE CASCADE;


--
-- Name: entry_components_json entry_components_json_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_components_json
    ADD CONSTRAINT entry_components_json_parent FOREIGN KEY (entry_id, component_type, payload_type) REFERENCES public.entry_components(entry_id, component_type, payload_type) ON DELETE CASCADE;


--
-- Name: entry_effects entry_effect_message; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_effects
    ADD CONSTRAINT entry_effect_message FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: entry_effects entry_effect_operator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_effects
    ADD CONSTRAINT entry_effect_operator FOREIGN KEY (operator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: entry_effects entry_effect_scope; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_effects
    ADD CONSTRAINT entry_effect_scope FOREIGN KEY (space_id, scope_id) REFERENCES public.scopes(space_id, id) ON DELETE CASCADE;


--
-- Name: entry_history entry_history_effect; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_history
    ADD CONSTRAINT entry_history_effect FOREIGN KEY (entry_effect_id) REFERENCES public.entry_effects(id) ON DELETE CASCADE;


--
-- Name: entry_identifiers entry_identifier_entry; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entry_identifiers
    ADD CONSTRAINT entry_identifier_entry FOREIGN KEY (scope_id, entry_id) REFERENCES public.entries(scope_id, id) ON DELETE CASCADE;


--
-- Name: entries entry_reference_note; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entry_reference_note FOREIGN KEY (reference_note_id) REFERENCES public.notes(id) ON DELETE SET NULL;


--
-- Name: entries entry_scope; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entry_scope FOREIGN KEY (scope_id) REFERENCES public.scopes(id) ON DELETE CASCADE;


--
-- Name: events event_channel; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT event_channel FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


--
-- Name: events event_receiver; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT event_receiver FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: events event_space; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT event_space FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: spaces_extension extension_space; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spaces_extension
    ADD CONSTRAINT extension_space FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: users_extension extension_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_extension
    ADD CONSTRAINT extension_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: media media_uploader; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_uploader FOREIGN KEY (uploader_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: messages message_character; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT message_character FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE SET NULL;


--
-- Name: messages message_portrait; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT message_portrait FOREIGN KEY (portrait_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- Name: notes note_access_channel; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT note_access_channel FOREIGN KEY (access_channel_id) REFERENCES public.channels(id);


--
-- Name: note_content_revisions note_content_revision_note; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_content_revisions
    ADD CONSTRAINT note_content_revision_note FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: note_content_revisions note_content_revision_operator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_content_revisions
    ADD CONSTRAINT note_content_revision_operator FOREIGN KEY (operator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notes notes_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_creator FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notes notes_space; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_space FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: reset_tokens password_reset_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reset_tokens
    ADD CONSTRAINT password_reset_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: restrained_members restrain_operator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restrained_members
    ADD CONSTRAINT restrain_operator FOREIGN KEY (operator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: restrained_members restrained_member_space; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restrained_members
    ADD CONSTRAINT restrained_member_space FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: restrained_members restrained_member_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restrained_members
    ADD CONSTRAINT restrained_member_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scopes scope_access_channel; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scopes
    ADD CONSTRAINT scope_access_channel FOREIGN KEY (access_channel_id) REFERENCES public.channels(id);


--
-- Name: scopes scope_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scopes
    ADD CONSTRAINT scope_owner FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: scopes scope_space; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scopes
    ADD CONSTRAINT scope_space FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: user_sessions session_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT "session_user" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: space_members space_member_space; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_members
    ADD CONSTRAINT space_member_space FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: space_members space_member_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_members
    ADD CONSTRAINT space_member_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: spaces space_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT space_owner FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: spaces space_scope; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT space_scope FOREIGN KEY (id, scope_id) REFERENCES public.scopes(space_id, id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: users user_avatar; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT user_avatar FOREIGN KEY (avatar_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--
