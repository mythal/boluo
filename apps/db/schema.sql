-- Dumped from database version 18.1 (Debian 18.1-1.pgdg13+2)
-- Dumped by pg_dump version 18.1 (Debian 18.1-1.pgdg13+2)

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
-- Name: character_visibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.character_visibility AS ENUM (
    'Private',
    'Public'
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
-- Name: note_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.note_type AS ENUM (
    'Term',
    'Character'
);


--
-- Name: note_visibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.note_visibility AS ENUM (
    'Private',
    'Channels',
    'Users',
    'Public'
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
-- Name: channel_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_members (
    user_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    join_date timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    character_name text NOT NULL,
    text_color text,
    is_joined boolean DEFAULT true NOT NULL,
    is_master boolean DEFAULT false NOT NULL
);


--
-- Name: channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channels (
    id uuid DEFAULT public.uuid_generate_v1mc() NOT NULL,
    name text NOT NULL,
    topic text DEFAULT ''::text NOT NULL,
    space_id uuid NOT NULL,
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
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
-- Name: character_variable_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_variable_history (
    id uuid DEFAULT public.uuid_generate_v1mc() NOT NULL,
    operator_id uuid,
    character_id uuid NOT NULL,
    reason jsonb,
    key public.citext NOT NULL,
    value jsonb NOT NULL,
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: character_variables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_variables (
    key public.citext NOT NULL,
    character_id uuid NOT NULL,
    display_name text DEFAULT ''::text NOT NULL,
    alias text[] DEFAULT '{}'::text[] NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    track_history boolean DEFAULT true NOT NULL,
    value jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    modified timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    CONSTRAINT character_variables_key_check CHECK ((length(TRIM(BOTH FROM key)) > 0))
);


--
-- Name: characters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.characters (
    id uuid DEFAULT public.uuid_generate_v1mc() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    color text DEFAULT ''::text NOT NULL,
    alias text,
    image_id uuid,
    space_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    visibility public.character_visibility DEFAULT 'Private'::public.character_visibility NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    modified timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
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
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
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
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
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
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    modified timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    pos_p integer NOT NULL,
    pos_q integer NOT NULL,
    pos double precision GENERATED ALWAYS AS (((pos_p)::double precision / (pos_q)::double precision)) STORED,
    color text DEFAULT ''::text NOT NULL
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT public.uuid_generate_v1mc() NOT NULL,
    type public.note_type DEFAULT 'Term'::public.note_type NOT NULL,
    space_id uuid NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    keywords text[] DEFAULT '{}'::text[] NOT NULL,
    disabled boolean DEFAULT false NOT NULL,
    owner_id uuid NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    visibility public.note_visibility DEFAULT 'Private'::public.note_visibility NOT NULL,
    visible_to uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    everyone_can_edit boolean DEFAULT false NOT NULL,
    track_history boolean DEFAULT false NOT NULL,
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    modified timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: notes_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes_history (
    id uuid DEFAULT public.uuid_generate_v1mc() NOT NULL,
    note_id uuid NOT NULL,
    operator_id uuid,
    content text DEFAULT ''::text NOT NULL,
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: proxies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxies (
    name text NOT NULL,
    url text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    region text DEFAULT ''::text NOT NULL,
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reset_tokens (
    token uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
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
    restrained_date timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    operator_id uuid
);


--
-- Name: space_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.space_members (
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    join_date timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);


--
-- Name: spaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spaces (
    id uuid DEFAULT public.uuid_generate_v1mc() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    modified timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    owner_id uuid NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    password text DEFAULT ''::text NOT NULL,
    language text DEFAULT ''::text NOT NULL,
    default_dice_type text DEFAULT 'd20'::text NOT NULL,
    explorable boolean DEFAULT false NOT NULL,
    invite_token uuid DEFAULT gen_random_uuid() NOT NULL,
    allow_spectator boolean DEFAULT true NOT NULL,
    latest_activity timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
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
    created timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    latest_activity timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
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
    joined timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
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
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: characters character_space_alias_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT character_space_alias_unique UNIQUE (space_id, alias);


--
-- Name: characters character_space_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT character_space_name_unique UNIQUE (space_id, name);


--
-- Name: character_variable_history character_variable_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_variable_history
    ADD CONSTRAINT character_variable_history_pkey PRIMARY KEY (id);


--
-- Name: character_variables character_variable_primary; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_variables
    ADD CONSTRAINT character_variable_primary PRIMARY KEY (character_id, key);


--
-- Name: characters characters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_pkey PRIMARY KEY (id);


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
-- Name: notes_history notes_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes_history
    ADD CONSTRAINT notes_history_pkey PRIMARY KEY (id);


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
-- Name: character_space_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX character_space_id_index ON public.characters USING btree (space_id);


--
-- Name: character_variable_character_sort_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX character_variable_character_sort_index ON public.character_variables USING btree (character_id, sort);


--
-- Name: character_variable_history_character_created_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX character_variable_history_character_created_index ON public.character_variable_history USING btree (character_id, created DESC);


--
-- Name: message_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_tags ON public.messages USING gin (tags);


--
-- Name: notes_history_note_created_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_history_note_created_index ON public.notes_history USING btree (note_id, created DESC);


--
-- Name: notes_space_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_space_index ON public.notes USING btree (space_id);


--
-- Name: notes_space_owner_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_space_owner_index ON public.notes USING btree (space_id, owner_id);


--
-- Name: reset_token_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reset_token_user ON public.reset_tokens USING btree (user_id);


--
-- Name: channel_members channel_member_channel; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_members
    ADD CONSTRAINT channel_member_channel FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


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
-- Name: characters character_image; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT character_image FOREIGN KEY (image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: characters character_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT character_owner FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: characters character_space; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT character_space FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: character_variables character_variable_character; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_variables
    ADD CONSTRAINT character_variable_character FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;


--
-- Name: character_variable_history character_variable_history_character; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_variable_history
    ADD CONSTRAINT character_variable_history_character FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;


--
-- Name: character_variable_history character_variable_history_operator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_variable_history
    ADD CONSTRAINT character_variable_history_operator FOREIGN KEY (operator_id) REFERENCES public.users(id) ON DELETE SET NULL;


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
-- Name: notes_history notes_history_note; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes_history
    ADD CONSTRAINT notes_history_note FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: notes_history notes_history_operator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes_history
    ADD CONSTRAINT notes_history_operator FOREIGN KEY (operator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notes notes_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_owner FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: users user_avatar; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT user_avatar FOREIGN KEY (avatar_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--
