ALTER TABLE channel_members
    ALTER COLUMN join_date SET DEFAULT now();

ALTER TABLE channels
    ALTER COLUMN created SET DEFAULT now();

ALTER TABLE character_variable_history
    ALTER COLUMN created SET DEFAULT now();

ALTER TABLE character_variables
    ALTER COLUMN created SET DEFAULT now(),
    ALTER COLUMN modified SET DEFAULT now();

ALTER TABLE characters
    ALTER COLUMN created SET DEFAULT now(),
    ALTER COLUMN modified SET DEFAULT now();

ALTER TABLE events
    ALTER COLUMN created SET DEFAULT now();

ALTER TABLE media
    ALTER COLUMN created SET DEFAULT now();

ALTER TABLE messages
    ALTER COLUMN created SET DEFAULT now(),
    ALTER COLUMN modified SET DEFAULT now();

ALTER TABLE notes
    ALTER COLUMN created SET DEFAULT now(),
    ALTER COLUMN modified SET DEFAULT now();

ALTER TABLE notes_history
    ALTER COLUMN created SET DEFAULT now();

ALTER TABLE proxies
    ALTER COLUMN created SET DEFAULT now();

ALTER TABLE reset_tokens
    ALTER COLUMN created SET DEFAULT now();

ALTER TABLE restrained_members
    ALTER COLUMN restrained_date SET DEFAULT now();

ALTER TABLE space_members
    ALTER COLUMN join_date SET DEFAULT now();

ALTER TABLE spaces
    ALTER COLUMN created SET DEFAULT now(),
    ALTER COLUMN modified SET DEFAULT now(),
    ALTER COLUMN latest_activity SET DEFAULT now();

ALTER TABLE user_sessions
    ALTER COLUMN created SET DEFAULT now(),
    ALTER COLUMN latest_activity SET DEFAULT now();

ALTER TABLE users
    ALTER COLUMN joined SET DEFAULT now();
