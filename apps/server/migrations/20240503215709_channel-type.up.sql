ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'in_game';
