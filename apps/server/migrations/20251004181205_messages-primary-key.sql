ALTER TABLE IF EXISTS messages
    DROP CONSTRAINT IF EXISTS messages_pkey;

ALTER TABLE IF EXISTS messages
    ADD CONSTRAINT messages_id_unique UNIQUE (id);

ALTER TABLE IF EXISTS messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (channel_id, id);
